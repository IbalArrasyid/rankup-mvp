import { type RankTierKey } from "@/config/business";
import { getNextProgressionStar, getProgressionIndex, getRankTierForStar } from "@/domain/rank";

export type PriceBreakdownRow = {
  tier: RankTierKey;
  label: string;
  startStar: number;
  endStar: number;
  stars: number;
  pricePerStar: number;
  subtotal: number;
};

export type PriceQuote = {
  totalStars: number;
  breakdown: PriceBreakdownRow[];
  subtotal: number;
  discount: number;
  total: number;
};

export class PricingValidationError extends Error {}

/** Prices each explicit upward win by the rank state reached by that win. */
export function calculatePrice(currentAbsoluteStar: number, targetAbsoluteStar: number): PriceQuote {
  if (!Number.isInteger(currentAbsoluteStar) || !Number.isInteger(targetAbsoluteStar)) {
    throw new PricingValidationError("Bintang harus berupa angka bulat.");
  }
  const currentIndex = getProgressionIndex(currentAbsoluteStar);
  const targetIndex = getProgressionIndex(targetAbsoluteStar);
  if (!getRankTierForStar(currentAbsoluteStar) || !getRankTierForStar(targetAbsoluteStar) || currentIndex === null || targetIndex === null) {
    throw new PricingValidationError("Bintang berada di luar rank yang didukung.");
  }
  if (targetIndex <= currentIndex) throw new PricingValidationError("Target bintang harus lebih tinggi dari bintang saat ini.");

  const breakdown: PriceBreakdownRow[] = [];
  let cursor = currentAbsoluteStar;
  while (cursor !== targetAbsoluteStar) {
    const next = getNextProgressionStar(cursor);
    const nextIndex = next === null ? null : getProgressionIndex(next);
    const cursorIndex = getProgressionIndex(cursor);
    if (next === null || nextIndex === null || cursorIndex === null || nextIndex <= cursorIndex || nextIndex > targetIndex) {
      throw new PricingValidationError("Target tidak berada pada jalur progression rank.");
    }
    const tier = getRankTierForStar(next);
    if (!tier) throw new PricingValidationError("Bintang berada di luar rank yang didukung.");
    const row = breakdown[breakdown.length - 1];
    if (row?.tier === tier.key) {
      row.endStar = next;
      row.stars += 1;
      row.subtotal += tier.regularPricePerStar;
    } else {
      breakdown.push({ tier: tier.key, label: tier.label, startStar: next, endStar: next, stars: 1, pricePerStar: tier.regularPricePerStar, subtotal: tier.regularPricePerStar });
    }
    cursor = next;
  }

  const subtotal = breakdown.reduce((total, row) => total + row.subtotal, 0);
  return { totalStars: targetIndex - currentIndex, breakdown, subtotal, discount: 0, total: subtotal };
}
