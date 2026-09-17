import { describe, expect, it } from "vitest";
import {
  createAdminSessionToken,
  verifyAdminCredentials,
  verifyAdminSessionToken,
} from "@/lib/admin-session";

const secret = "test-admin-session-secret-that-is-long-enough";
const now = new Date("2026-09-03T00:00:00.000Z").getTime();

describe("admin session", () => {
  it("accepts a signed, unexpired session", () => {
    const token = createAdminSessionToken(now, secret);
    expect(verifyAdminSessionToken(token, now, secret)).toBe(true);
  });

  it("rejects an invalid signature and a token signed with another secret", () => {
    const token = createAdminSessionToken(now, secret);
    expect(verifyAdminSessionToken(`${token}x`, now, secret)).toBe(false);
    expect(verifyAdminSessionToken(token, now, `${secret}-other`)).toBe(false);
  });

  it("rejects an expired session", () => {
    const token = createAdminSessionToken(now, secret);
    expect(verifyAdminSessionToken(token, now + (10 * 60 * 60 * 1000) + 1, secret)).toBe(false);
  });
});

describe("admin credential verification", () => {
  it("accepts only the configured username and password pair", () => {
    expect(verifyAdminCredentials("owner", "correct-password", "owner", "correct-password")).toBe(true);
    expect(verifyAdminCredentials("intruder", "correct-password", "owner", "correct-password")).toBe(false);
    expect(verifyAdminCredentials("owner", "wrong-password", "owner", "correct-password")).toBe(false);
  });

  it("fails closed when either configured credential is missing", () => {
    expect(verifyAdminCredentials("owner", "correct-password", undefined, "correct-password")).toBe(false);
    expect(verifyAdminCredentials("owner", "correct-password", "owner", undefined)).toBe(false);
  });
});
