export const BUSINESS = {
  brandName: "RankUp",
  market: "Indonesia",
  currency: "IDR",
  supportEmail: "halo@rankup.id",
} as const;

export const RANK_TIERS = [
  { key: "EPIC", label: "Epic", minStar: -50, maxStar: -26, regularPricePerStar: 10_000, hasDivisions: true },
  { key: "LEGEND", label: "Legend", minStar: -25, maxStar: -1, regularPricePerStar: 12_000, hasDivisions: true },
  { key: "MYTHIC", label: "Mythic", minStar: 0, maxStar: 24, regularPricePerStar: 14_000, hasDivisions: false },
  { key: "MYTHICAL_HONOR", label: "Mythical Honor", minStar: 25, maxStar: 49, regularPricePerStar: 15_500, hasDivisions: false },
  { key: "MYTHICAL_GLORY", label: "Mythical Glory", minStar: 50, maxStar: 99, regularPricePerStar: 18_000, hasDivisions: false },
  { key: "MYTHICAL_IMMORTAL", label: "Mythical Immortal", minStar: 100, maxStar: null, regularPricePerStar: 20_000, hasDivisions: false },
] as const;

export type RankTier = (typeof RANK_TIERS)[number];
export type RankTierKey = RankTier["key"];
