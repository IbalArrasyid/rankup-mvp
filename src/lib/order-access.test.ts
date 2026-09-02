import { describe, expect, it } from "vitest";
import { createOrderAccessToken, verifyOrderAccessToken } from "@/lib/order-access";

const secret = "test-order-access-secret-that-is-long-enough";
const now = new Date("2026-09-02T00:00:00.000Z").getTime();

describe("order access token", () => {
  it("authorizes only its signed, unexpired order", () => {
    const token = createOrderAccessToken("ML-260902-ABCD", now, secret);
    expect(verifyOrderAccessToken(token, "ML-260902-ABCD", now, secret)).toBe(true);
    expect(verifyOrderAccessToken(token, "ML-260902-EFGH", now, secret)).toBe(false);
  });

  it("rejects a forged, modified, or expired token", () => {
    const token = createOrderAccessToken("ML-260902-ABCD", now, secret);
    expect(verifyOrderAccessToken(`${token}x`, "ML-260902-ABCD", now, secret)).toBe(false);
    expect(verifyOrderAccessToken(token, "ML-260902-ABCD", now + 86_401_000, secret)).toBe(false);
    expect(verifyOrderAccessToken(token, "ML-260902-ABCD", now, `${secret}different`)).toBe(false);
  });

  it("rejects a missing token", () => {
    expect(verifyOrderAccessToken(undefined, "ML-260902-ABCD", now, secret)).toBe(false);
  });

  it("fails closed for a too-short signing secret", () => {
    expect(() => createOrderAccessToken("ML-260902-ABCD", now, "short")).toThrow();
  });
});
