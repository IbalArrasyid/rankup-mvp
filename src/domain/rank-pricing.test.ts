import { describe, expect, it } from "vitest";
import { calculatePrice } from "@/domain/pricing";
import { formatRankPosition, getDivisionForAbsoluteStar, getNextProgressionStar, toAbsoluteStar } from "@/domain/rank";

describe("Epic and Legend rank ladder", () => {
  it("represents fifth-star division states without changing Mythic absolute stars", () => {
    expect(toAbsoluteStar("EPIC", 0, "V")).toBe(-60);
    expect(toAbsoluteStar("EPIC", 3, "III")).toBe(-45);
    expect(toAbsoluteStar("LEGEND", 5, "I")).toBe(-1);
    expect(toAbsoluteStar("MYTHIC", 12)).toBe(12);
    expect(() => toAbsoluteStar("EPIC", 0, "INVALID" as never)).toThrow("Divisi rank tidak valid.");
    expect(getDivisionForAbsoluteStar(-45)).toEqual({ division: "III", star: 3 });
    expect(formatRankPosition(-45)).toBe("Epic III · 3 bintang");
  });

  it("models Legend I 5 directly to Mythic 1", () => {
    const legendI4 = toAbsoluteStar("LEGEND", 4, "I");
    const legendI5 = toAbsoluteStar("LEGEND", 5, "I");
    const mythic1 = toAbsoluteStar("MYTHIC", 1);
    const mythic2 = toAbsoluteStar("MYTHIC", 2);

    expect(getNextProgressionStar(legendI5)).toBe(mythic1);
    expect(calculatePrice(legendI4, legendI5)).toMatchObject({ totalStars: 1, total: 12_000, breakdown: [{ tier: "LEGEND", stars: 1 }] });
    expect(calculatePrice(legendI5, mythic1)).toMatchObject({ totalStars: 1, total: 14_000, breakdown: [{ tier: "MYTHIC", stars: 1 }] });
    expect(calculatePrice(legendI4, mythic1)).toMatchObject({ totalStars: 2, total: 26_000, breakdown: [{ tier: "LEGEND", stars: 1 }, { tier: "MYTHIC", stars: 1 }] });
    expect(calculatePrice(legendI5, mythic2)).toMatchObject({ totalStars: 2, total: 28_000, breakdown: [{ tier: "MYTHIC", stars: 2 }] });
    expect(calculatePrice(legendI4, mythic2)).toMatchObject({ totalStars: 3, total: 40_000 });
  });

  it("does not bill Mythic 0 or Legend V 0 as artificial promotion wins", () => {
    const quote = calculatePrice(toAbsoluteStar("LEGEND", 0, "V"), toAbsoluteStar("MYTHIC", 1));
    expect(quote.breakdown).toMatchObject([{ tier: "LEGEND", stars: 25 }, { tier: "MYTHIC", stars: 1 }]);
    expect(calculatePrice(toAbsoluteStar("EPIC", 5, "I"), toAbsoluteStar("LEGEND", 1, "V"))).toMatchObject({ totalStars: 1, total: 12_000, breakdown: [{ tier: "LEGEND", stars: 1 }] });
  });

  it("retains existing Mythic+ boundaries", () => {
    expect(calculatePrice(24, 25).total).toBe(15_500);
    expect(calculatePrice(49, 50).total).toBe(18_000);
    expect(calculatePrice(99, 100).total).toBe(20_000);
  });
});
