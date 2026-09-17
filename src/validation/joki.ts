import { z } from "zod";
import { RANK_TIERS, type RankTierKey } from "@/config/business";
import { isStarValidForTier } from "@/domain/rank";
import { SERVICE_MODES } from "@/domain/service-mode";

const rankKeys = RANK_TIERS.map((tier) => tier.key) as [RankTierKey, ...RankTierKey[]];

export const jokiRoleSchema = z.enum(["JUNGLE", "MID", "GOLD", "EXP", "ROAM"]);
export const jokiStatusSchema = z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]);
export const jokiAvailabilitySchema = z.enum(["AVAILABLE", "BUSY", "OFFLINE"]);

export const jokiProfileSchema = z
  .object({
    name: z.string().trim().min(2, "Masukkan nama joki.").max(100),
    whatsapp: z.string().trim().min(8).max(24),
    telegramUsername: z.string().trim().max(100).optional(),
    peakRank: z.enum(rankKeys),
    peakStar: z.number().int().min(0),
    currentRank: z.enum(rankKeys).optional(),
    currentStar: z.number().int().min(0).optional(),
    serviceModes: z.array(z.enum(SERVICE_MODES)).min(1, "Pilih minimal satu jenis layanan."),
    roles: z.array(jokiRoleSchema).min(1, "Pilih minimal satu role."),
    heroPool: z.array(z.string().trim().max(80)).transform((heroes) =>
      [...new Set(heroes.map((hero) => hero.trim()).filter(Boolean))],
    ),
    status: jokiStatusSchema.default("ACTIVE"),
    availability: jokiAvailabilitySchema.default("AVAILABLE"),
    notes: z.string().trim().max(1_000).optional(),
  })
  .superRefine((value, context) => {
    if (!isStarValidForTier(value.peakRank, value.peakStar)) {
      context.addIssue({ code: "custom", path: ["peakStar"], message: "Bintang peak tidak sesuai dengan rank." });
    }
    if (Boolean(value.currentRank) !== Boolean(value.currentStar !== undefined)) {
      context.addIssue({ code: "custom", path: ["currentRank"], message: "Rank dan bintang saat ini harus diisi bersama." });
    }
    if (value.currentRank && value.currentStar !== undefined && !isStarValidForTier(value.currentRank, value.currentStar)) {
      context.addIssue({ code: "custom", path: ["currentStar"], message: "Bintang saat ini tidak sesuai dengan rank." });
    }
  });

export type JokiProfileInput = z.infer<typeof jokiProfileSchema>;
