import { RANK_TIERS, type RankTier, type RankTierKey } from "@/config/business";

export function getRankTierByKey(key: RankTierKey): RankTier {
  const tier = RANK_TIERS.find((item) => item.key === key);

  if (!tier) {
    throw new Error("Tier rank tidak dikenal.");
  }

  return tier;
}

export function getRankTierForStar(star: number): RankTier | null {
  if (!Number.isInteger(star) || star < 0) {
    return null;
  }

  return (
    RANK_TIERS.find(
      (tier) => star >= tier.minStar && (tier.maxStar === null || star <= tier.maxStar),
    ) ?? null
  );
}

export function isStarValidForTier(key: RankTierKey, star: number): boolean {
  const tier = getRankTierByKey(key);
  return (
    Number.isInteger(star) &&
    star >= tier.minStar &&
    (tier.maxStar === null || star <= tier.maxStar)
  );
}

export function getStarRangeLabel(tier: RankTier): string {
  return tier.maxStar === null
    ? `${tier.minStar}+ bintang`
    : `${tier.minStar}–${tier.maxStar} bintang`;
}
