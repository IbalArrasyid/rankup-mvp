import { calculatePrice, type PriceQuote } from "@/domain/pricing";

export const SERVICE_MODES = ["ACCOUNT", "GENDONG"] as const;

export type ServiceMode = (typeof SERVICE_MODES)[number];

type ServiceModeMeta = {
  label: string;
  shortLabel: string;
  explanation: string;
};

export const SERVICE_MODE_META = {
  ACCOUNT: {
    label: "Joki Login",
    shortLabel: "Login",
    explanation: "Joki memainkan akun kamu.",
  },
  GENDONG: {
    label: "Joki Gendong",
    shortLabel: "Gendong",
    explanation: "Kamu akan bermain bersama Joki menggunakan akunmu sendiri.",
  },
} as const satisfies Record<ServiceMode, ServiceModeMeta>;

export class ServiceModeValidationError extends Error {}

export function isServiceMode(value: unknown): value is ServiceMode {
  return typeof value === "string" && (SERVICE_MODES as readonly string[]).includes(value);
}

export function assertServiceMode(value: unknown): asserts value is ServiceMode {
  if (!isServiceMode(value)) {
    throw new ServiceModeValidationError("Mode layanan tidak valid.");
  }
}

export function getServiceModeLabel(mode: ServiceMode): string {
  assertServiceMode(mode);
  return SERVICE_MODE_META[mode].label;
}

export function getServiceModeExplanation(mode: ServiceMode): string {
  assertServiceMode(mode);
  return SERVICE_MODE_META[mode].explanation;
}

export function requiresCredentials(mode: ServiceMode): boolean {
  assertServiceMode(mode);
  return mode === "ACCOUNT";
}

export function formatServiceModeCapabilities(modes: readonly ServiceMode[]): string {
  for (const mode of modes) assertServiceMode(mode);

  const selected = new Set(modes);
  const labels = SERVICE_MODES.filter((mode) => selected.has(mode)).map(
    (mode) => SERVICE_MODE_META[mode].shortLabel,
  );

  return labels.length > 0 ? labels.join(" + ") : "Belum ada layanan";
}

/** Both modes intentionally share the existing rank/star pricing in this phase. */
export function calculateOrderPrice(
  serviceMode: ServiceMode,
  currentAbsoluteStar: number,
  targetAbsoluteStar: number,
): PriceQuote {
  assertServiceMode(serviceMode);
  return calculatePrice(currentAbsoluteStar, targetAbsoluteStar);
}
