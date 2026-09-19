import { describe, expect, it } from "vitest";
import { calculatePrice } from "@/domain/pricing";
import { formatRankPosition, getDivisionForAbsoluteStar, toAbsoluteStar } from "@/domain/rank";

describe("Epic and Legend rank ladder", () => {
  it("extends below Mythic without changing Mythic absolute stars", () => {
    expect(toAbsoluteStar("EPIC", 0, "V")).toBe(-50);
    expect(toAbsoluteStar("EPIC", 3, "III")).toBe(-37);
    expect(toAbsoluteStar("LEGEND", 4, "I")).toBe(-1);
    expect(toAbsoluteStar("MYTHIC", 12)).toBe(12);
    expect(() => toAbsoluteStar("EPIC", 0, "INVALID" as never)).toThrow("Divisi rank tidak valid.");
    expect(getDivisionForAbsoluteStar(-37)).toEqual({ division: "III", star: 3 });
    expect(formatRankPosition(-37)).toBe("Epic III · 3 bintang");
  });

  it.each([
    [-50, -45, 50_000],
    [-26, -24, 24_000],
    [-25, 0, 302_000],
    [-25, -20, 60_000],
    [-30, -20, 112_000],
    [-5, 0, 62_000],
    [-50, 0, 554_000],
  ])("charges each gained star in its canonical tier (%i to %i)", (current, target, total) => {
    expect(calculatePrice(current, target).total).toBe(total);
  });

  it("preserves destination-star charging at the Epic-to-Legend boundary", () => {
    expect(calculatePrice(toAbsoluteStar("EPIC", 4, "I"), toAbsoluteStar("LEGEND", 1, "V")).total).toBe(24_000);
  });

  it("retains existing Mythic+ boundaries", () => {
    expect(calculatePrice(24, 25).total).toBe(15_500);
    expect(calculatePrice(49, 50).total).toBe(18_000);
    expect(calculatePrice(99, 100).total).toBe(20_000);
  });
});
