import { describe, expect, it } from "vitest";
import { generatePublicOrderId, publicOrderIdPattern } from "@/domain/order-id";

describe("generatePublicOrderId", () => {
  it("uses the documented readable format", () => {
    expect(generatePublicOrderId(new Date("2026-09-02T00:00:00Z"))).toMatch(publicOrderIdPattern);
  });

  it("has a non-sequential random component", () => {
    const ids = new Set(Array.from({ length: 200 }, () => generatePublicOrderId()));
    expect(ids.size).toBe(200);
  });
});
