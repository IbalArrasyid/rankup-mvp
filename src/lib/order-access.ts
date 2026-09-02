import { createHmac, timingSafeEqual } from "node:crypto";

const ORDER_ACCESS_COOKIE = "rankup_order_access";
const ACCESS_TTL_SECONDS = 60 * 60 * 24;

type AccessPayload = { orderId: string; exp: number };

export class OrderAccessError extends Error {}

function getAccessSecret(secret = process.env.ORDER_ACCESS_SECRET): string {
  if (!secret || secret.length < 32) {
    throw new OrderAccessError("Konfigurasi akses pesanan belum tersedia.");
  }
  return secret;
}

export function assertOrderAccessSecret(): void {
  getAccessSecret();
}

function sign(payload: string, secret?: string): string {
  return createHmac("sha256", getAccessSecret(secret)).update(payload).digest("base64url");
}

export function createOrderAccessToken(
  orderId: string,
  now = Date.now(),
  secret?: string,
): string {
  const payload: AccessPayload = { orderId, exp: Math.floor(now / 1000) + ACCESS_TTL_SECONDS };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifyOrderAccessToken(
  token: string | undefined,
  expectedOrderId: string,
  now = Date.now(),
  secret?: string,
): boolean {
  if (!token) return false;

  const [encoded, receivedSignature, ...extra] = token.split(".");
  if (!encoded || !receivedSignature || extra.length > 0) return false;

  const expectedSignature = sign(encoded, secret);
  const received = Buffer.from(receivedSignature);
  const expected = Buffer.from(expectedSignature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as AccessPayload;
    return payload.orderId === expectedOrderId && Number.isInteger(payload.exp) && payload.exp > now / 1000;
  } catch {
    return false;
  }
}

export const orderAccessCookie = {
  name: ORDER_ACCESS_COOKIE,
  maxAge: ACCESS_TTL_SECONDS,
};
