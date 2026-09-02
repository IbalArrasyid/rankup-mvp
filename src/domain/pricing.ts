import { RANK_TIERS, type RankTierKey } from "@/config/business";
import { getRankTierForStar } from "@/domain/rank";

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

/** Prices each gained star in (currentAbsoluteStar, targetAbsoluteStar]. */
export function calculatePrice(
  currentAbsoluteStar: number,
  targetAbsoluteStar: number,
): PriceQuote {
  if (!Number.isInteger(currentAbsoluteStar) || !Number.isInteger(targetAbsoluteStar)) {
    throw new PricingValidationError("Bintang harus berupa angka bulat.");
  }
  if (!getRankTierForStar(currentAbsoluteStar) || !getRankTierForStar(targetAbsoluteStar)) {
    throw new PricingValidationError("Bintang berada di luar rank yang didukung.");
  }
  if (targetAbsoluteStar <= currentAbsoluteStar) {
    throw new PricingValidationError("Target bintang harus lebih tinggi dari bintang saat ini.");
  }

  const breakdown: PriceBreakdownRow[] = [];

  for (const tier of RANK_TIERS) {
    const segmentStart = Math.max(currentAbsoluteStar + 1, tier.minStar);
    const tierEnd = tier.maxStar ?? targetAbsoluteStar;
    const segmentEnd = Math.min(targetAbsoluteStar, tierEnd);

    if (segmentStart > segmentEnd) continue;

    const stars = segmentEnd - segmentStart + 1;
    breakdown.push({
      tier: tier.key,
      label: tier.label,
      startStar: segmentStart,
      endStar: segmentEnd,
      stars,
      pricePerStar: tier.regularPricePerStar,
      subtotal: stars * tier.regularPricePerStar,
    });
  }

  const subtotal = breakdown.reduce((total, row) => total + row.subtotal, 0);

  return {
    totalStars: targetAbsoluteStar - currentAbsoluteStar,
    breakdown,
    subtotal,
    discount: 0,
    total: subtotal,
  };
}
