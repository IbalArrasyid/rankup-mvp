import { describe, expect, it } from "vitest";
import { normalizeIndonesianWhatsapp, WhatsappValidationError } from "@/domain/whatsapp";

describe("normalizeIndonesianWhatsapp", () => {
  it.each(["081234567890", "81234567890", "6281234567890", "+6281234567890"])("normalizes %s", (input) => {
    expect(normalizeIndonesianWhatsapp(input)).toBe("6281234567890");
  });

  it.each(["", "071234567890", "62812", "62812345678901234567", "+60123456789"])("rejects %s", (input) => {
    expect(() => normalizeIndonesianWhatsapp(input)).toThrow(WhatsappValidationError);
  });
});
