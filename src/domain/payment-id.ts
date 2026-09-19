import { randomBytes } from "node:crypto";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePublicPaymentId(now = new Date()): string {
  const date = [String(now.getUTCFullYear()).slice(-2), String(now.getUTCMonth() + 1).padStart(2, "0"), String(now.getUTCDate()).padStart(2, "0")].join("");
  const bytes = randomBytes(4);
  const suffix = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  return `PAY-${date}-${suffix}`;
}

export function generateDokuInvoice(publicPaymentId: string): string {
  return publicPaymentId.replace(/[^A-Z0-9-]/g, "");
}
