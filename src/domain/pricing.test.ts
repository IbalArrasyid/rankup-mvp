import { describe, expect, it } from "vitest";
import { calculatePrice, PricingValidationError } from "@/domain/pricing";

describe("calculatePrice", () => {
  it("prices Mythic within the same tier", () => {
    expect(calculatePrice(10, 20)).toMatchObject({ totalStars: 10, total: 140_000, breakdown: [{ tier: "MYTHIC", stars: 10, subtotal: 140_000 }] });
  });

  it("prices Mythic to Honor across the boundary", () => {
    expect(calculatePrice(20, 30)).toMatchObject({ totalStars: 10, total: 149_000, breakdown: [{ tier: "MYTHIC", startStar: 21, endStar: 24, stars: 4 }, { tier: "MYTHICAL_HONOR", startStar: 25, endStar: 30, stars: 6 }] });
  });

  it("prices Honor within the same tier", () => {
    expect(calculatePrice(30, 40)).toMatchObject({ total: 155_000, breakdown: [{ tier: "MYTHICAL_HONOR", stars: 10 }] });
  });

  it("prices Honor to Glory using the gained star tier", () => {
    expect(calculatePrice(45, 55)).toMatchObject({ totalStars: 10, total: 170_000, breakdown: [{ tier: "MYTHICAL_HONOR", stars: 4, subtotal: 62_000 }, { tier: "MYTHICAL_GLORY", stars: 6, subtotal: 108_000 }] });
  });

  it("prices Glory within the same tier", () => {
    expect(calculatePrice(70, 80)).toMatchObject({ total: 180_000, breakdown: [{ tier: "MYTHICAL_GLORY", stars: 10 }] });
  });

  it("prices Glory to Immortal across the boundary", () => {
    expect(calculatePrice(95, 105)).toMatchObject({ total: 192_000, breakdown: [{ tier: "MYTHICAL_GLORY", stars: 4, pricePerStar: 18_000 }, { tier: "MYTHICAL_IMMORTAL", stars: 6, pricePerStar: 20_000 }] });
  });

  it("prices Mythic to Immortal across every tier", () => {
    expect(calculatePrice(0, 100)).toMatchObject({ totalStars: 100, total: 1_643_500, breakdown: [{ tier: "MYTHIC", stars: 24 }, { tier: "MYTHICAL_HONOR", stars: 25 }, { tier: "MYTHICAL_GLORY", stars: 50 }, { tier: "MYTHICAL_IMMORTAL", stars: 1 }] });
  });

  it.each([[24, 25, 15_500, "MYTHICAL_HONOR"], [49, 50, 18_000, "MYTHICAL_GLORY"], [99, 100, 20_000, "MYTHICAL_IMMORTAL"]])("charges the correct tier at boundary %i to %i", (current, target, total, tier) => {
    expect(calculatePrice(current, target)).toMatchObject({ total, breakdown: [{ tier, stars: 1 }] });
  });

  it("rejects an equal or lower target", () => {
    expect(() => calculatePrice(32, 32)).toThrow(PricingValidationError);
    expect(() => calculatePrice(32, 31)).toThrow(PricingValidationError);
  });
});
