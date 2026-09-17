"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { type OrderStatus } from "@/generated/prisma/client";
import { publicJokiIdPattern } from "@/domain/joki-id";
import { toAbsoluteStar } from "@/domain/rank";
import { RANK_TIERS, type RankTierKey } from "@/config/business";
import { verifyAdminCredentials } from "@/lib/admin-session";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  changeAdminOrderStatus,
  markOrderPaymentPaid,
  recordAdminLoginAttempt,
  revealAdminOrderCredential,
  updateAdminOrderProgress,
} from "@/server/admin/orders";
import { assignJokiToOrder, unassignJokiFromOrder } from "@/server/admin/assignments";
import { cancelOpenJobPosting, getOpenJobNotificationRecipients, publishJobPosting, recordJobNotificationResend } from "@/server/jobs/job-pool";
import { notifyTelegramJobRecipients } from "@/server/telegram/notifications";
import {
  createAdminSession,
  destroyAdminSession,
  hasAdminSession,
  requireAdminSession,
} from "@/server/admin/session";
import { ORDER_STATUS_META } from "@/domain/status";

type CredentialRevealResult =
  | { ok: true; credential: Awaited<ReturnType<typeof revealAdminOrderCredential>> }
  | { ok: false; message: string };

async function canMakeAdminRequest(scope: string): Promise<boolean> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for");
  const client = forwarded?.split(",")[0]?.trim() ?? "local";
  return checkRateLimit(`admin:${scope}:${client}`, 8, 60_000);
}

function loginErrorRedirect(): never {
  redirect("/admin/login?error=invalid");
}

function orderRedirect(publicId: string, key: "notice" | "error", value: string): never {
  redirect(`/admin/orders/${encodeURIComponent(publicId)}?${key}=${encodeURIComponent(value)}`);
}

function isOrderStatus(value: string): value is OrderStatus {
  return value in ORDER_STATUS_META;
}

function isRankTierKey(value: string): value is RankTierKey {
  return RANK_TIERS.some((tier) => tier.key === value);
}

function logAdminActionFailure(action: string): void {
  console.error(`Admin ${action} action failed.`);
}

export async function loginAdminAction(formData: FormData): Promise<void> {
  if (!(await canMakeAdminRequest("login"))) loginErrorRedirect();

  const username = formData.get("username");
  const password = formData.get("password");
  const valid = typeof username === "string"
    && typeof password === "string"
    && verifyAdminCredentials(username, password);
  if (!valid) {
    try {
      await recordAdminLoginAttempt(false);
    } catch {
      // The login response remains generic if the audit store is temporarily unavailable.
    }
    loginErrorRedirect();
  }

  try {
    await createAdminSession();
  } catch {
    logAdminActionFailure("login");
    loginErrorRedirect();
  }
  try {
    await recordAdminLoginAttempt(true);
  } catch {
    // Authentication remains ENV-based if the operational audit store is unavailable.
  }
  redirect("/admin");
}

export async function logoutAdminAction(): Promise<void> {
  if (await hasAdminSession()) await destroyAdminSession();
  redirect("/admin/login");
}

export async function markOrderPaidAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const publicId = formData.get("publicId");
  if (typeof publicId !== "string" || !publicId) orderRedirect("", "error", "Pesanan tidak valid.");

  let errorMessage: string | null = null;
  let paymentChanged = false;
  try {
    const result = await markOrderPaymentPaid(publicId);
    paymentChanged = result.changed;
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${publicId}`);
  } catch {
    logAdminActionFailure("payment confirmation");
    errorMessage = "Pembayaran belum dapat diperbarui.";
  }
  if (errorMessage) orderRedirect(publicId, "error", errorMessage);
  orderRedirect(publicId, "notice", paymentChanged ? "Pembayaran berhasil dikonfirmasi." : "Pembayaran sudah dikonfirmasi sebelumnya.");
}

export async function changeOrderStatusAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const publicId = formData.get("publicId");
  const status = formData.get("status");
  if (typeof publicId !== "string" || !publicId || typeof status !== "string" || !isOrderStatus(status)) {
    orderRedirect(typeof publicId === "string" ? publicId : "", "error", "Perubahan status tidak valid.");
  }

  let errorMessage: string | null = null;
  try {
    await changeAdminOrderStatus(publicId, status);
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${publicId}`);
  } catch {
    logAdminActionFailure("status update");
    errorMessage = "Status pesanan belum dapat diperbarui.";
  }
  if (errorMessage) orderRedirect(publicId, "error", errorMessage);
  orderRedirect(publicId, "notice", "Status pesanan diperbarui.");
}

export async function updateOrderProgressAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const publicId = formData.get("publicId");
  const rank = formData.get("progressRank");
  const rawStar = formData.get("progressStar");
  const star = typeof rawStar === "string" ? Number(rawStar) : Number.NaN;
  if (typeof publicId !== "string" || !publicId || typeof rank !== "string" || !isRankTierKey(rank) || !Number.isInteger(star)) {
    orderRedirect(typeof publicId === "string" ? publicId : "", "error", "Rank dan bintang progress tidak valid.");
  }

  let nextAbsoluteStar: number;
  try {
    nextAbsoluteStar = toAbsoluteStar(rank, star);
  } catch {
    orderRedirect(publicId, "error", "Bintang tidak sesuai dengan rank progress.");
  }

  let errorMessage: string | null = null;
  let progressChanged = false;
  try {
    const result = await updateAdminOrderProgress(publicId, nextAbsoluteStar);
    progressChanged = result.changed;
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${publicId}`);
  } catch {
    logAdminActionFailure("progress update");
    errorMessage = "Progress belum dapat diperbarui.";
  }
  if (errorMessage) orderRedirect(publicId, "error", errorMessage);
  orderRedirect(publicId, "notice", progressChanged ? "Progress pesanan diperbarui." : "Progress belum berubah.");
}

export async function revealOrderCredentialAction(publicId: string): Promise<CredentialRevealResult> {
  await requireAdminSession();
  if (!publicId) return { ok: false, message: "Data login belum tersedia." };

  try {
    const credential = await revealAdminOrderCredential(publicId);
    if (!credential) return { ok: false, message: "Data login belum tersedia." };
    revalidatePath(`/admin/orders/${publicId}`);
    return { ok: true, credential };
  } catch {
    logAdminActionFailure("credential reveal");
    return { ok: false, message: "Data login belum dapat dibuka." };
  }
}

export async function assignJokiAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const publicId = formData.get("publicId");
  const jokiPublicId = formData.get("jokiPublicId");
  if (typeof publicId !== "string" || !publicId || typeof jokiPublicId !== "string" || !publicJokiIdPattern.test(jokiPublicId)) {
    orderRedirect(typeof publicId === "string" ? publicId : "", "error", "Data penugasan joki tidak valid.");
  }

  let errorMessage: string | null = null;
  try {
    await assignJokiToOrder(publicId, jokiPublicId);
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${publicId}`);
    revalidatePath("/admin/joki");
  } catch {
    logAdminActionFailure("joki assignment");
    errorMessage = "Joki belum dapat ditugaskan.";
  }
  if (errorMessage) orderRedirect(publicId, "error", errorMessage);
  orderRedirect(publicId, "notice", "Joki berhasil ditugaskan.");
}

export async function unassignJokiAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const publicId = formData.get("publicId");
  const rawReason = formData.get("reason");
  if (typeof publicId !== "string" || !publicId) orderRedirect("", "error", "Pesanan tidak valid.");
  const reason = typeof rawReason === "string" ? rawReason.trim().slice(0, 1_000) : undefined;

  let errorMessage: string | null = null;
  try {
    await unassignJokiFromOrder(publicId, reason || undefined);
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${publicId}`);
    revalidatePath("/admin/joki");
  } catch {
    logAdminActionFailure("joki unassignment");
    errorMessage = "Penugasan belum dapat dibatalkan.";
  }
  if (errorMessage) orderRedirect(publicId, "error", errorMessage);
  orderRedirect(publicId, "notice", "Penugasan dibatalkan. Pesanan kembali menunggu joki.");
}

export async function publishJobAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const publicId = formData.get("publicId");
  if (typeof publicId !== "string" || !publicId) orderRedirect("", "error", "Pesanan tidak valid.");

  let errorMessage: string | null = null;
  let notice = "Job berhasil dipublish.";
  try {
    const { job, order, recipients } = await publishJobPosting(publicId);
    const delivery = await notifyTelegramJobRecipients({
      publicId: job.publicId,
      order: {
        initialAbsoluteStar: order.initialAbsoluteStar,
        progressAbsoluteStar: order.progressAbsoluteStar,
        serviceMode: order.serviceMode,
        targetAbsoluteStar: order.targetAbsoluteStar,
      },
    }, recipients);
    notice = delivery.sent > 0
      ? `Job berhasil dipublish dan dikirim ke ${delivery.sent} Joki Telegram.`
      : "Job dipublish, tetapi belum ada Joki Telegram yang memenuhi syarat.";
    revalidatePath("/admin");
    revalidatePath("/admin/jobs");
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${publicId}`);
  } catch {
    logAdminActionFailure("job publication");
    errorMessage = "Job belum dapat dipublish.";
  }
  if (errorMessage) orderRedirect(publicId, "error", errorMessage);
  orderRedirect(publicId, "notice", notice);
}

export async function cancelJobAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const jobPublicId = formData.get("jobPublicId");
  const orderPublicId = formData.get("orderPublicId");
  if (typeof jobPublicId !== "string" || !jobPublicId || typeof orderPublicId !== "string" || !orderPublicId) {
    orderRedirect(typeof orderPublicId === "string" ? orderPublicId : "", "error", "Job tidak valid.");
  }

  let errorMessage: string | null = null;
  try {
    await cancelOpenJobPosting(jobPublicId);
    revalidatePath("/admin/jobs");
    revalidatePath(`/admin/orders/${orderPublicId}`);
  } catch {
    logAdminActionFailure("job cancellation");
    errorMessage = "Job belum dapat dibatalkan.";
  }
  if (errorMessage) orderRedirect(orderPublicId, "error", errorMessage);
  orderRedirect(orderPublicId, "notice", "Job Pool dibatalkan. Pesanan tetap menunggu Joki.");
}

export async function resendJobNotificationAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const jobPublicId = formData.get("jobPublicId");
  const orderPublicId = formData.get("orderPublicId");
  if (typeof jobPublicId !== "string" || !jobPublicId || typeof orderPublicId !== "string" || !orderPublicId) {
    orderRedirect(typeof orderPublicId === "string" ? orderPublicId : "", "error", "Job tidak valid.");
  }

  let errorMessage: string | null = null;
  let notice = "Notifikasi Job dikirim ulang.";
  try {
    const { job, recipients } = await getOpenJobNotificationRecipients(jobPublicId);
    const delivery = await notifyTelegramJobRecipients(job, recipients);
    await recordJobNotificationResend(jobPublicId);
    notice = delivery.sent > 0
      ? `Notifikasi dikirim ulang ke ${delivery.sent} Joki Telegram.`
      : "Tidak ada Joki Telegram yang memenuhi syarat saat ini.";
    revalidatePath("/admin/jobs");
    revalidatePath(`/admin/orders/${orderPublicId}`);
  } catch {
    logAdminActionFailure("job notification resend");
    errorMessage = "Notifikasi Job belum dapat dikirim ulang.";
  }
  if (errorMessage) orderRedirect(orderPublicId, "error", errorMessage);
  orderRedirect(orderPublicId, "notice", notice);
}
