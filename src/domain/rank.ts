import { RANK_TIERS, type RankTier, type RankTierKey } from "@/config/business";
export const RANK_DIVISIONS = ["V", "IV", "III", "II", "I"] as const;
export type RankDivision = (typeof RANK_DIVISIONS)[number];

export function isRankDivision(value: unknown): value is RankDivision {
  return typeof value === "string" && (RANK_DIVISIONS as readonly string[]).includes(value);
}


export function getRankTierByKey(key: RankTierKey): RankTier {
  const tier = RANK_TIERS.find((item) => item.key === key);

  if (!tier) {
    throw new Error("Tier rank tidak dikenal.");
  }

  return tier;
}

export function getRankTierForStar(star: number): RankTier | null {
  if (!Number.isInteger(star)) {
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

export function isDivisionStarValid(star: number): boolean {
  return Number.isInteger(star) && star >= 0 && star <= 4;
}

function divisionBase(key: RankTierKey, division: RankDivision): number {
  const tier = getRankTierByKey(key);
  if (!tier.hasDivisions) throw new Error("Divisi tidak tersedia untuk rank ini.");
  if (!isRankDivision(division)) throw new Error("Divisi rank tidak valid.");
  return tier.minStar + RANK_DIVISIONS.indexOf(division) * 5;
}

export function toAbsoluteStar(key: RankTierKey, star: number, division?: RankDivision): number {
  const tier = getRankTierByKey(key);
  if (tier.hasDivisions) {
    if (!division || !isDivisionStarValid(star)) throw new Error("Divisi atau bintang rank tidak valid.");
    return divisionBase(key, division) + star;
  }
  if (!isStarValidForTier(key, star)) throw new Error("Bintang tidak sesuai dengan rank.");
  return star;
}

export function getDivisionForAbsoluteStar(star: number): { division: RankDivision; star: number } | null {
  const tier = getRankTierForStar(star);
  if (!tier?.hasDivisions) return null;
  const offset = star - tier.minStar;
  return { division: RANK_DIVISIONS[Math.floor(offset / 5)]!, star: offset % 5 };
}

export function formatRankPosition(star: number): string {
  const tier = getRankTierForStar(star);
  if (!tier) return "Rank tidak dikenal";
  const division = getDivisionForAbsoluteStar(star);
  return division ? `${tier.label} ${division.division} · ${division.star} bintang` : `${tier.label} ${star} bintang`;
}

export function getStarRangeLabel(tier: RankTier): string {
  return tier.hasDivisions ? "Divisi V–I · 0–4 bintang" : tier.maxStar === null
    ? `${tier.minStar}+ bintang`
    : `${tier.minStar}–${tier.maxStar} bintang`;
}
