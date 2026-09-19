import { Prisma } from "@/generated/prisma/client";
import { generateDokuInvoice, generatePublicPaymentId } from "@/domain/payment-id";
import { createDokuQrisCheckout, DokuCheckoutError } from "@/lib/doku/client";
import { getDokuCallbackBaseUrl } from "@/lib/doku/config";
import { getPrisma } from "@/lib/prisma";

export class PaymentError extends Error {}

function activeCheckout(attempt: { status: string; checkoutUrl: string | null; expiresAt: Date | null }, now = new Date()): boolean {
  return attempt.status === "PENDING" && Boolean(attempt.checkoutUrl) && (!attempt.expiresAt || attempt.expiresAt > now);
}

export async function getCustomerPayment(orderPublicId: string) {
  return getPrisma().paymentAttempt.findFirst({ where: { order: { publicId: orderPublicId } }, orderBy: { createdAt: "desc" }, select: { publicId: true, status: true, checkoutUrl: true, expiresAt: true, paidAt: true, amount: true, currency: true, provider: true, method: true } });
}

export async function createPaymentCheckout(orderPublicId: string): Promise<{ checkoutUrl: string; reused: boolean }> {
  const prisma = getPrisma();
  const order = await prisma.order.findUnique({ where: { publicId: orderPublicId }, select: { id: true, publicId: true, customerName: true, email: true, whatsapp: true, total: true, currency: true, paymentStatus: true } });
  if (!order) throw new PaymentError("Pesanan tidak ditemukan.");
  if (order.paymentStatus === "PAID") throw new PaymentError("Pesanan sudah dibayar.");
  const latest = await prisma.paymentAttempt.findFirst({ where: { orderId: order.id, status: "PENDING" }, orderBy: { createdAt: "desc" } });
  if (latest && activeCheckout(latest)) return { checkoutUrl: latest.checkoutUrl!, reused: true };
  if (latest) await prisma.paymentAttempt.update({ where: { id: latest.id }, data: { status: "EXPIRED", failedAt: new Date() } });

  const publicId = generatePublicPaymentId();
  const providerInvoiceNumber = generateDokuInvoice(publicId);
  const attempt = await prisma.paymentAttempt.create({ data: { publicId, orderId: order.id, provider: "DOKU", method: "QRIS", status: "PENDING", amount: order.total, currency: order.currency, providerInvoiceNumber } });
  try {
    const callbackBaseUrl = getDokuCallbackBaseUrl();
    const checkout = await createDokuQrisCheckout({ invoiceNumber: providerInvoiceNumber, amount: order.total, customerName: order.customerName, customerEmail: order.email, customerPhone: order.whatsapp, returnUrl: callbackBaseUrl ? `${callbackBaseUrl}/order/${order.publicId}/payment/return` : null, notificationUrl: callbackBaseUrl ? `${callbackBaseUrl}/api/payments/doku/notification` : null });
    await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { checkoutUrl: checkout.checkoutUrl, providerRequestId: checkout.requestId, providerPaymentId: checkout.providerPaymentId, expiresAt: checkout.expiresAt } });
    return { checkoutUrl: checkout.checkoutUrl, reused: false };
  } catch (error) {
    await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { status: "FAILED", failedAt: new Date() } });
    const diagnostic = error instanceof DokuCheckoutError ? error.diagnostic : {
      environment: process.env.DOKU_ENV === "production" ? "production" as const : "sandbox" as const,
      endpointHost: process.env.DOKU_ENV === "production" ? "api.doku.com" : "api-sandbox.doku.com",
      requestTarget: "/checkout/v1/payment",
      httpStatus: null,
      dokuMessage: "checkout request failed before a provider response",
      requestId: null,
      invoiceNumber: providerInvoiceNumber,
      amount: order.total,
      currency: order.currency,
      paymentMethodTypes: ["QRIS"],
    };
    console.error({ event: "doku-checkout-failed", ...diagnostic, paymentAttemptPublicId: attempt.publicId, orderPublicId });
    throw error;
  }
}

export type DokuNotification = { invoiceNumber: string; amount: number; currency: string; transactionStatus: string; providerPaymentId: string | null };

export function parseDokuNotification(payload: unknown): DokuNotification | null {
  if (!payload || typeof payload !== "object") return null;
  const body = payload as { order?: Record<string, unknown>; transaction?: Record<string, unknown> };
  const invoiceNumber = body.order?.invoice_number;
  const amount = body.order?.amount;
  const currency = body.order?.currency ?? "IDR";
  const transactionStatus = body.transaction?.status;
  const providerPaymentId = body.transaction?.payment_id;
  const parsedAmount = typeof amount === "number" ? amount : Number(amount);
  return typeof invoiceNumber === "string" && Number.isInteger(parsedAmount) && typeof currency === "string" && typeof transactionStatus === "string"
    ? { invoiceNumber, amount: parsedAmount, currency, transactionStatus, providerPaymentId: typeof providerPaymentId === "string" ? providerPaymentId : null }
    : null;
}

export async function applyDokuNotification(notification: DokuNotification): Promise<"acknowledged" | "unknown" | "mismatch"> {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.paymentAttempt.findUnique({ where: { providerInvoiceNumber: notification.invoiceNumber }, include: { order: { select: { id: true, total: true, currency: true, paymentStatus: true, status: true } } } });
    if (!attempt) return "unknown";
    if (attempt.amount !== notification.amount || attempt.order.total !== notification.amount || attempt.currency !== notification.currency || attempt.order.currency !== notification.currency) {
      console.error("DOKU notification amount mismatch", { paymentAttemptPublicId: attempt.publicId, providerStatus: notification.transactionStatus });
      return "mismatch";
    }
    if (attempt.order.paymentStatus === "PAID" || attempt.status === "PAID") return "acknowledged";
    // DOKU Checkout advises merchants to ignore FAILED because the customer can retry a method within Checkout.
    if (notification.transactionStatus !== "SUCCESS") return "acknowledged";
    const now = new Date();
    const updated = await tx.paymentAttempt.updateMany({ where: { id: attempt.id, status: "PENDING" }, data: { status: "PAID", paidAt: now, providerPaymentId: notification.providerPaymentId ?? attempt.providerPaymentId } });
    if (updated.count !== 1) return "acknowledged";
    const orderUpdate = await tx.order.updateMany({ where: { id: attempt.orderId, paymentStatus: { not: "PAID" } }, data: { paymentStatus: "PAID", ...(attempt.order.status === "AWAITING_PAYMENT" ? { status: "PAID" } : {}) } });
    if (orderUpdate.count === 1) {
      await tx.orderEvent.create({ data: { orderId: attempt.orderId, type: "PAYMENT_UPDATED", status: attempt.order.status === "AWAITING_PAYMENT" ? "PAID" : undefined, publicMessage: "Pembayaran QRIS berhasil dikonfirmasi." } });
      await tx.paymentAttempt.updateMany({ where: { orderId: attempt.orderId, id: { not: attempt.id }, status: "PENDING" }, data: { status: "CANCELLED" } });
    }
    return "acknowledged";
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
