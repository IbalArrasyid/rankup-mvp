import { timingSafeEqual } from "node:crypto";

export function hasValidTelegramWebhookSecret(provided: string | null): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected || !provided) return false;
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  return expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes);
}
