import { describe, expect, it } from "vitest";
import { parseNormalizedWhatsapp } from "@/validation/orders";
import { jokiProfileSchema } from "@/validation/joki";

const validProfile = {
  name: "Raka", whatsapp: "0812 3456 7890", peakRank: "MYTHICAL_GLORY", peakStar: 50,
  currentRank: "MYTHICAL_HONOR", currentStar: 30, serviceModes: ["ACCOUNT"], roles: ["JUNGLE"], heroPool: ["Ling", "Ling", ""],
  status: "ACTIVE", availability: "AVAILABLE",
};

describe("joki profile validation", () => {
  it("accepts a valid profile and normalizes hero entries", () => {
    expect(jokiProfileSchema.parse(validProfile)).toMatchObject({
      name: "Raka", serviceModes: ["ACCOUNT"], roles: ["JUNGLE"], heroPool: ["Ling"], peakStar: 50,
    });
  });

  it("uses the established WhatsApp normalization", () => {
    expect(parseNormalizedWhatsapp(validProfile.whatsapp)).toBe("6281234567890");
  });

  it("rejects an invalid peak rank/star combination", () => {
    expect(jokiProfileSchema.safeParse({ ...validProfile, peakRank: "MYTHICAL_HONOR", peakStar: 24 }).success).toBe(false);
  });

  it("requires at least one service mode", () => {
    expect(jokiProfileSchema.safeParse({ ...validProfile, serviceModes: [] }).success).toBe(false);
  });

  it("rejects unsupported service modes", () => {
    expect(jokiProfileSchema.safeParse({ ...validProfile, serviceModes: ["ACCOUNT", "UNKNOWN"] }).success).toBe(false);
  });

  it("requires at least one role", () => {
    expect(jokiProfileSchema.safeParse({ ...validProfile, roles: [] }).success).toBe(false);
  });
});
