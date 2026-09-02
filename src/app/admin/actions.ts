"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { type OrderStatus } from "@/generated/prisma/client";
import { verifyAdminPassword } from "@/lib/admin-session";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  changeAdminOrderStatus,
  markOrderPaymentPaid,
  recordAdminLoginAttempt,
  revealAdminOrderCredential,
  updateAdminOrderProgress,
} from "@/server/admin/orders";
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

export async function loginAdminAction(formData: FormData): Promise<void> {
  if (!(await canMakeAdminRequest("login"))) loginErrorRedirect();

  const password = formData.get("password");
  const valid = typeof password === "string" && verifyAdminPassword(password);
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
    await recordAdminLoginAttempt(true);
  } catch {
    await destroyAdminSession();
    loginErrorRedirect();
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

  try {
    const result = await markOrderPaymentPaid(publicId);
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${publicId}`);
    orderRedirect(publicId, "notice", result.changed ? "Pembayaran berhasil dikonfirmasi." : "Pembayaran sudah dikonfirmasi sebelumnya.");
  } catch {
    orderRedirect(publicId, "error", "Pembayaran belum dapat diperbarui.");
  }
}

export async function changeOrderStatusAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const publicId = formData.get("publicId");
  const status = formData.get("status");
  if (typeof publicId !== "string" || !publicId || typeof status !== "string" || !isOrderStatus(status)) {
    orderRedirect(typeof publicId === "string" ? publicId : "", "error", "Perubahan status tidak valid.");
  }

  try {
    await changeAdminOrderStatus(publicId, status);
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${publicId}`);
    orderRedirect(publicId, "notice", "Status pesanan diperbarui.");
  } catch {
    orderRedirect(publicId, "error", "Status pesanan belum dapat diperbarui.");
  }
}

export async function updateOrderProgressAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const publicId = formData.get("publicId");
  const rawProgress = formData.get("progressAbsoluteStar");
  const nextAbsoluteStar = typeof rawProgress === "string" ? Number(rawProgress) : Number.NaN;
  if (typeof publicId !== "string" || !publicId || !Number.isInteger(nextAbsoluteStar)) {
    orderRedirect(typeof publicId === "string" ? publicId : "", "error", "Progress harus berupa jumlah bintang bulat.");
  }

  try {
    const result = await updateAdminOrderProgress(publicId, nextAbsoluteStar);
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${publicId}`);
    orderRedirect(publicId, "notice", result.changed ? "Progress pesanan diperbarui." : "Progress belum berubah.");
  } catch {
    orderRedirect(publicId, "error", "Progress belum dapat diperbarui.");
  }
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
    return { ok: false, message: "Data login belum dapat dibuka." };
  }
}
