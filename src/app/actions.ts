"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkRateLimit } from "@/lib/rate-limit";
import { createPaymentCheckout } from "@/server/payments";
import { assertOrderAccessSecret } from "@/lib/order-access";
import { hasOrderAccess, grantOrderAccess } from "@/server/order-access";
import { createOrder, findOrderForTracking, saveCredential } from "@/server/orders";
import {
  credentialSchema,
  orderCreationSchema,
  parseNormalizedWhatsapp,
  trackOrderSchema,
} from "@/validation/orders";

type ActionResult = { ok: true; redirectTo?: string; message?: string } | { ok: false; message: string };

async function canMakeRequest(scope: string): Promise<boolean> {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for");
  const client = forwarded?.split(",")[0]?.trim() ?? "local";
  return checkRateLimit(`${scope}:${client}`);
}

export async function createOrderAction(payload: unknown): Promise<ActionResult> {
  if (!(await canMakeRequest("order"))) {
    return { ok: false, message: "Terlalu banyak percobaan. Coba lagi sebentar lagi." };
  }

  const parsed = orderCreationSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Data pesanan belum valid." };

  let whatsapp: string;
  try {
    whatsapp = parseNormalizedWhatsapp(parsed.data.whatsapp);
  } catch {
    return { ok: false, message: "Gunakan nomor WhatsApp Indonesia yang valid." };
  }

  let destination: string;
  try {
    assertOrderAccessSecret();
    const order = await createOrder(parsed.data, whatsapp);
    await grantOrderAccess(order.publicId);
    destination = `/order/${order.publicId}`;
  } catch {
    return {
      ok: false,
      message: "Pesanan belum dapat dibuat. Coba lagi beberapa saat lagi.",
    };
  }

  redirect(destination);
}

export async function trackOrderAction(payload: unknown): Promise<ActionResult> {
  if (!(await canMakeRequest("track"))) {
    return { ok: false, message: "Terlalu banyak percobaan. Coba lagi sebentar lagi." };
  }

  const parsed = trackOrderSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Data pelacakan belum valid." };

  let whatsapp: string;
  try {
    whatsapp = parseNormalizedWhatsapp(parsed.data.whatsapp);
  } catch {
    return { ok: false, message: "Gunakan nomor WhatsApp Indonesia yang valid." };
  }

  const order = await findOrderForTracking(parsed.data.publicId, whatsapp);
  if (!order) {
    return { ok: false, message: "Pesanan tidak ditemukan. Periksa nomor pesanan dan WhatsApp Anda." };
  }

  await grantOrderAccess(order.publicId);
  redirect(`/order/${order.publicId}`);
}

export async function saveCredentialAction(publicId: string, payload: unknown): Promise<ActionResult> {
  if (!(await hasOrderAccess(publicId))) {
    return { ok: false, message: "Akses pesanan tidak valid. Lacak pesanan lagi untuk melanjutkan." };
  }
  if (!(await canMakeRequest("credential"))) {
    return { ok: false, message: "Terlalu banyak percobaan. Coba lagi sebentar lagi." };
  }

  const parsed = credentialSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Data login belum valid." };

  try {
    const result = await saveCredential(publicId, parsed.data);
    if (!result) return { ok: false, message: "Pesanan tidak ditemukan." };
    revalidatePath(`/order/${publicId}`);
    revalidatePath(`/order/${publicId}/credentials`);
    return { ok: true, redirectTo: `/order/${publicId}`, message: "Data login diterima secara aman." };
  } catch {
    return { ok: false, message: "Data login belum dapat disimpan. Hubungi dukungan bila masalah berlanjut." };
  }
}
export async function startDokuPaymentAction(publicId: string): Promise<ActionResult> {
  if (!(await hasOrderAccess(publicId))) return { ok: false, message: "Akses pesanan tidak valid. Lacak pesanan lagi untuk melanjutkan." };
  if (!(await canMakeRequest("payment"))) return { ok: false, message: "Terlalu banyak percobaan. Coba lagi sebentar lagi." };
  try {
    const payment = await createPaymentCheckout(publicId);
    return { ok: true, redirectTo: payment.checkoutUrl };
  } catch {
    return { ok: false, message: "Gagal membuat pembayaran QRIS. Silakan coba lagi." };
  }
}
