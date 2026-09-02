import { z } from "zod";
import { RANK_TIERS } from "@/config/business";
import { isStarValidForTier } from "@/domain/rank";
import { normalizeIndonesianWhatsapp } from "@/domain/whatsapp";

const rankKeySchema = z.enum(RANK_TIERS.map((tier) => tier.key) as unknown as ["MYTHIC" | "MYTHICAL_HONOR" | "MYTHICAL_GLORY" | "MYTHICAL_IMMORTAL", ...("MYTHIC" | "MYTHICAL_HONOR" | "MYTHICAL_GLORY" | "MYTHICAL_IMMORTAL")[]]);

export const rankSelectionSchema = z
  .object({
    currentRank: rankKeySchema,
    currentStar: z.coerce.number().int().min(0),
    targetRank: rankKeySchema,
    targetStar: z.coerce.number().int().min(0),
  })
  .superRefine((value, context) => {
    if (!isStarValidForTier(value.currentRank, value.currentStar)) {
      context.addIssue({ code: "custom", path: ["currentStar"], message: "Bintang tidak sesuai dengan rank saat ini." });
    }
    if (!isStarValidForTier(value.targetRank, value.targetStar)) {
      context.addIssue({ code: "custom", path: ["targetStar"], message: "Bintang tidak sesuai dengan rank target." });
    }
    if (value.targetStar <= value.currentStar) {
      context.addIssue({ code: "custom", path: ["targetStar"], message: "Target harus lebih tinggi dari rank saat ini." });
    }
  });

export const orderCreationSchema = rankSelectionSchema.extend({
  customerName: z.string().trim().min(2, "Masukkan nama lengkap.").max(100),
  whatsapp: z.string().trim().min(8).max(24),
  email: z.union([z.literal(""), z.string().trim().email("Format email belum benar.")]).optional(),
  customerNotes: z.string().trim().max(1_000, "Catatan terlalu panjang.").optional(),
});

export const trackOrderSchema = z.object({
  publicId: z.string().trim().toUpperCase().regex(/^ML-\d{6}-[A-HJ-NP-Z2-9]{4}$/, "Nomor pesanan tidak valid."),
  whatsapp: z.string().trim().min(8).max(24),
});

export const credentialSchema = z.object({
  loginMethod: z.enum(["MOONTON", "GOOGLE", "FACEBOOK", "TIKTOK", "OTHER"]),
  identifier: z.string().trim().min(2, "Masukkan email atau identifier login.").max(254),
  secret: z.string().min(4, "Masukkan password atau secret login.").max(500),
  accountId: z.string().trim().min(2, "Masukkan User ID MLBB.").max(100),
  serverId: z.string().trim().min(1, "Masukkan Server ID MLBB.").max(100),
  notes: z.string().trim().max(1_000).optional(),
});

export function parseNormalizedWhatsapp(value: string): string {
  return normalizeIndonesianWhatsapp(value);
}

export type OrderCreationInput = z.infer<typeof orderCreationSchema>;
export type TrackOrderInput = z.infer<typeof trackOrderSchema>;
export type CredentialInput = z.infer<typeof credentialSchema>;
