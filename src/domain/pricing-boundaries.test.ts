import { describe, expect, it } from "vitest";
import { calculatePrice, PricingValidationError } from "@/domain/pricing";

describe("absolute-star pricing boundaries", () => {
  it("charges Mythic 23 to 24 as one Mythic gained star", () => {
    expect(calculatePrice(23, 24)).toEqual({
      totalStars: 1,
      breakdown: [{ tier: "MYTHIC", label: "Mythic", startStar: 24, endStar: 24, stars: 1, pricePerStar: 14_000, subtotal: 14_000 }],
      subtotal: 14_000,
      discount: 0,
      total: 14_000,
    });
  });

  it("charges each tier boundary at the destination tier", () => {
    expect(calculatePrice(24, 25)).toMatchObject({ totalStars: 1, breakdown: [{ tier: "MYTHICAL_HONOR", stars: 1, pricePerStar: 15_500, subtotal: 15_500 }], subtotal: 15_500, total: 15_500 });
    expect(calculatePrice(49, 50)).toMatchObject({ totalStars: 1, breakdown: [{ tier: "MYTHICAL_GLORY", stars: 1, pricePerStar: 18_000, subtotal: 18_000 }], subtotal: 18_000, total: 18_000 });
    expect(calculatePrice(99, 100)).toMatchObject({ totalStars: 1, breakdown: [{ tier: "MYTHICAL_IMMORTAL", stars: 1, pricePerStar: 20_000, subtotal: 20_000 }], subtotal: 20_000, total: 20_000 });
  });

  it("produces the exact Honor 45 to Glory 55 breakdown", () => {
    expect(calculatePrice(45, 55)).toEqual({
      totalStars: 10,
      breakdown: [
        { tier: "MYTHICAL_HONOR", label: "Mythical Honor", startStar: 46, endStar: 49, stars: 4, pricePerStar: 15_500, subtotal: 62_000 },
        { tier: "MYTHICAL_GLORY", label: "Mythical Glory", startStar: 50, endStar: 55, stars: 6, pricePerStar: 18_000, subtotal: 108_000 },
      ],
      subtotal: 170_000,
      discount: 0,
      total: 170_000,
    });
  });

  it("prices Mythic 20 to Immortal 105 across every tier", () => {
    const quote = calculatePrice(20, 105);
    expect(quote.totalStars).toBe(85);
    expect(quote.breakdown).toMatchObject([
      { tier: "MYTHIC", stars: 4, pricePerStar: 14_000, subtotal: 56_000 },
      { tier: "MYTHICAL_HONOR", stars: 25, pricePerStar: 15_500, subtotal: 387_500 },
      { tier: "MYTHICAL_GLORY", stars: 50, pricePerStar: 18_000, subtotal: 900_000 },
      { tier: "MYTHICAL_IMMORTAL", stars: 6, pricePerStar: 20_000, subtotal: 120_000 },
    ]);
    expect(quote.subtotal).toBe(1_463_500);
    expect(quote.total).toBe(1_463_500);
  });

  it("rejects equal and lower targets", () => {
    expect(() => calculatePrice(55, 55)).toThrow(PricingValidationError);
    expect(() => calculatePrice(55, 54)).toThrow(PricingValidationError);
  });
});
