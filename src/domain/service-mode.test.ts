import { describe, expect, it } from "vitest";
import { calculatePrice } from "@/domain/pricing";
import {
  calculateOrderPrice,
  formatServiceModeCapabilities,
  getServiceModeExplanation,
  getServiceModeLabel,
  isServiceMode,
  requiresCredentials,
  ServiceModeValidationError,
  type ServiceMode,
} from "@/domain/service-mode";

describe("service mode", () => {
  it("exposes typed labels and customer explanations", () => {
    expect(getServiceModeLabel("ACCOUNT")).toBe("Joki Login");
    expect(getServiceModeLabel("GENDONG")).toBe("Joki Gendong");
    expect(getServiceModeExplanation("ACCOUNT")).toBe("Joki memainkan akun kamu.");
    expect(getServiceModeExplanation("GENDONG")).toBe(
      "Kamu akan bermain bersama Joki menggunakan akunmu sendiri.",
    );
  });

  it("requires credentials only for account-login orders", () => {
    expect(requiresCredentials("ACCOUNT")).toBe(true);
    expect(requiresCredentials("GENDONG")).toBe(false);
  });

  it("formats Joki capabilities in a stable order", () => {
    expect(formatServiceModeCapabilities(["ACCOUNT"])).toBe("Login");
    expect(formatServiceModeCapabilities(["GENDONG"])).toBe("Gendong");
    expect(formatServiceModeCapabilities(["GENDONG", "ACCOUNT", "GENDONG"])).toBe(
      "Login + Gendong",
    );
    expect(formatServiceModeCapabilities([])).toBe("Belum ada layanan");
  });

  it("rejects an unsupported runtime mode", () => {
    expect(isServiceMode("BOOST")).toBe(false);
    expect(() => getServiceModeLabel("BOOST" as ServiceMode)).toThrow(
      ServiceModeValidationError,
    );
  });

  it("keeps ACCOUNT and GENDONG pricing identical to the existing engine", () => {
    const existingQuote = calculatePrice(45, 55);

    expect(calculateOrderPrice("ACCOUNT", 45, 55)).toEqual(existingQuote);
    expect(calculateOrderPrice("GENDONG", 45, 55)).toEqual(existingQuote);
  });
});
