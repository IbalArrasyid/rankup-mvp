import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const tokenBytes = 32;

export type TelegramLinkTokenRecord = {
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
};

export function generateTelegramLinkToken(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(tokenBytes).toString("base64url");
  return { rawToken, tokenHash: hashTelegramLinkToken(rawToken) };
}

export function hashTelegramLinkToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function isValidTelegramLinkToken(
  record: TelegramLinkTokenRecord | null,
  rawToken: string,
  now = new Date(),
): boolean {
  if (!record || record.usedAt || record.expiresAt <= now) return false;
  const suppliedHash = Buffer.from(hashTelegramLinkToken(rawToken), "hex");
  const storedHash = Buffer.from(record.tokenHash, "hex");
  return suppliedHash.length === storedHash.length && timingSafeEqual(suppliedHash, storedHash);
}

export function isTelegramUserId(value: string): boolean {
  return /^\d{1,20}$/.test(value);
}
