import { describe, expect, it } from "vitest";
import { generateTelegramLinkToken, hashTelegramLinkToken, isTelegramUserId, isValidTelegramLinkToken } from "@/domain/telegram-link";

describe("Telegram link tokens", () => {
  it("returns a raw token only for delivery and a one-way hash for storage", () => {
    const token = generateTelegramLinkToken();
    expect(token.rawToken).not.toBe(token.tokenHash);
    expect(token.tokenHash).toBe(hashTelegramLinkToken(token.rawToken));
  });

  it("accepts only an unexpired, unused matching token", () => {
    const token = generateTelegramLinkToken();
    const valid = { tokenHash: token.tokenHash, expiresAt: new Date("2026-09-14T01:00:00Z"), usedAt: null };
    expect(isValidTelegramLinkToken(valid, token.rawToken, new Date("2026-09-14T00:59:00Z"))).toBe(true);
    expect(isValidTelegramLinkToken(valid, "wrong", new Date("2026-09-14T00:59:00Z"))).toBe(false);
    expect(isValidTelegramLinkToken({ ...valid, usedAt: new Date("2026-09-14T00:30:00Z") }, token.rawToken, new Date("2026-09-14T00:59:00Z"))).toBe(false);
    expect(isValidTelegramLinkToken(valid, token.rawToken, new Date("2026-09-14T01:00:00Z"))).toBe(false);
  });

  it("only accepts a numeric Telegram user ID as identity", () => {
    expect(isTelegramUserId("123456789")).toBe(true);
    expect(isTelegramUserId("joki_username")).toBe(false);
  });
});
