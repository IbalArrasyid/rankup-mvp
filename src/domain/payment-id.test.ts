import { describe, expect, it } from "vitest";
import { generateDokuInvoice, generatePublicPaymentId } from "@/domain/payment-id";

describe("payment public IDs", () => {
  it("generates valid, unique DOKU-safe payment references", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generatePublicPaymentId(new Date("2026-09-19T00:00:00Z"))));
    expect(ids.size).toBe(100);
    for (const id of ids) {
      expect(id).toMatch(/^PAY-260919-[A-HJ-NP-Z2-9]{4}$/);
      expect(generateDokuInvoice(id)).toBe(id);
    }
  });
});
