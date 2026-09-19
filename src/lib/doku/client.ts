import { randomUUID } from "node:crypto";
import { getDokuConfig } from "@/lib/doku/config";
import { dokuSignature } from "@/lib/doku/signature";

export const DOKU_CHECKOUT_REQUEST_TARGET = "/checkout/v1/payment";
const paymentMethodTypes = ["QRIS"] as const;

export type CreateDokuCheckoutInput = { invoiceNumber: string; amount: number; customerName: string; customerEmail: string | null; customerPhone: string; returnUrl: string | null; notificationUrl: string | null };
export type DokuCheckoutResult = { checkoutUrl: string; requestId: string; expiresAt: Date | null; providerPaymentId: string | null };
export type DokuCheckoutFailureDiagnostic = { environment: "sandbox" | "production"; endpointHost: string; requestTarget: string; httpStatus: number | null; dokuMessage: string; requestId: string; invoiceNumber: string; amount: number; currency: "IDR"; paymentMethodTypes: readonly ["QRIS"] };

export class DokuCheckoutError extends Error {
  constructor(readonly diagnostic: DokuCheckoutFailureDiagnostic) {
    super(`DOKU checkout gagal (${diagnostic.httpStatus ?? "request"}).`);
  }
}

function sanitizeDokuMessage(payload: unknown, status: number): string {
  const message = payload && typeof payload === "object" && typeof (payload as { message?: unknown }).message === "string" ? (payload as { message: string }).message : null;
  return message ? message.replace(/\s+/g, " ").slice(0, 256) : `non-JSON or message-less provider response (${status})`;
}

function parseExpiry(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const matched = value.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!matched) return null;
  return new Date(`${matched[1]}-${matched[2]}-${matched[3]}T${matched[4]}:${matched[5]}:${matched[6]}Z`);
}

export async function createDokuQrisCheckout(input: CreateDokuCheckoutInput): Promise<DokuCheckoutResult> {
  const config = getDokuConfig();
  const requestId = randomUUID();
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const body = JSON.stringify({
    order: { amount: input.amount, invoice_number: input.invoiceNumber, currency: "IDR", ...(input.returnUrl ? { callback_url_result: input.returnUrl, callback_url_cancel: input.returnUrl } : {}), disable_retry_payment: true },
    payment: { payment_due_date: 15, type: "SALE", payment_method_types: paymentMethodTypes },
    customer: { name: input.customerName, phone: input.customerPhone, ...(input.customerEmail ? { email: input.customerEmail } : {}) },
    ...(input.notificationUrl ? { additional_info: { override_notification_url: input.notificationUrl } } : {}),
  });
  const signature = dokuSignature({ clientId: config.clientId, requestId, timestamp, requestTarget: DOKU_CHECKOUT_REQUEST_TARGET, rawBody: body, secretKey: config.secretKey });
  const response = await fetch(`${config.baseUrl}${DOKU_CHECKOUT_REQUEST_TARGET}`, { method: "POST", headers: { "Content-Type": "application/json", "Client-Id": config.clientId, "Request-Id": requestId, "Request-Timestamp": timestamp, Signature: signature }, body, cache: "no-store" });
  const responseText = await response.text();
  let payload: unknown = null;
  try { payload = JSON.parse(responseText); } catch { /* provider response is deliberately not logged */ }
  const diagnostic = { environment: config.environment, endpointHost: new URL(config.baseUrl).host, requestTarget: DOKU_CHECKOUT_REQUEST_TARGET, httpStatus: response.status, dokuMessage: sanitizeDokuMessage(payload, response.status), requestId, invoiceNumber: input.invoiceNumber, amount: input.amount, currency: "IDR" as const, paymentMethodTypes };
  if (!response.ok) throw new DokuCheckoutError(diagnostic);
  if (!payload || typeof payload !== "object") throw new DokuCheckoutError(diagnostic);
  const payment = (payload as { response?: { payment?: Record<string, unknown> } }).response?.payment;
  const checkoutUrl = payment?.url;
  if (typeof checkoutUrl !== "string" || !checkoutUrl.startsWith("https://")) throw new DokuCheckoutError({ ...diagnostic, dokuMessage: "provider response did not include a valid checkout URL" });
  return { checkoutUrl, requestId, expiresAt: parseExpiry(payment?.expired_date) ?? new Date(Date.now() + 15 * 60_000), providerPaymentId: typeof payment?.token_id === "string" ? payment.token_id : null };
}
