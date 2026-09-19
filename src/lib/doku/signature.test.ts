import { describe, expect, it } from "vitest";
import { dokuDigest, dokuSignature, verifyDokuSignature } from "@/lib/doku/signature";

describe("DOKU non-SNAP signatures", () => {
  const input = { clientId: "MCH-TEST", requestId: "request-123", timestamp: "2026-09-19T00:00:00Z", requestTarget: "/api/payments/doku/notification", rawBody: '{"order":{"amount":10000}}', secretKey: "secret" };

  it("hashes the raw JSON body and signs documented canonical components", () => {
    expect(dokuDigest(input.rawBody)).toBe("+SlYgGoBI3qNtbtd2mRDJUgYSwWFZfTA44htNq7XdEA=");
    expect(dokuSignature(input)).toMatch(/^HMACSHA256=/);
  });

  it("accepts only an exact valid signature", () => {
    const signature = dokuSignature(input);
    expect(verifyDokuSignature({ ...input, signature })).toBe(true);
    expect(verifyDokuSignature({ ...input, rawBody: "{}", signature })).toBe(false);
    expect(verifyDokuSignature({ ...input, signature: "HMACSHA256=invalid" })).toBe(false);
  });
});
