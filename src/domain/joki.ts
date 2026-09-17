import type { JokiAvailability, JokiRole, JokiStatus } from "@/generated/prisma/client";
import type { ServiceMode } from "@/domain/service-mode";

export const JOKI_ROLE_META: Record<JokiRole, string> = {
  JUNGLE: "Jungle",
  MID: "Mid Lane",
  GOLD: "Gold Lane",
  EXP: "EXP Lane",
  ROAM: "Roam",
};

export const JOKI_STATUS_META: Record<JokiStatus, { label: string; tone: string }> = {
  ACTIVE: { label: "Aktif", tone: "emerald" },
  INACTIVE: { label: "Nonaktif", tone: "slate" },
  SUSPENDED: { label: "Ditangguhkan", tone: "rose" },
};

export const JOKI_AVAILABILITY_META: Record<JokiAvailability, { label: string; tone: string }> = {
  AVAILABLE: { label: "Tersedia", tone: "emerald" },
  BUSY: { label: "Sibuk", tone: "amber" },
  OFFLINE: { label: "Offline", tone: "slate" },
};

export type JokiAvailabilityInput = {
  status: JokiStatus;
  availability: JokiAvailability;
  hasActiveAssignment: boolean;
};

export type JokiEligibilityInput = JokiAvailabilityInput & {
  peakAbsoluteStar: number;
  targetAbsoluteStar: number;
  serviceModes: readonly ServiceMode[];
  orderServiceMode: ServiceMode;
};

export function isJokiAvailableForWork(input: JokiAvailabilityInput): boolean {
  return input.status === "ACTIVE"
    && input.availability === "AVAILABLE"
    && !input.hasActiveAssignment;
}

export function isJokiEligibleForOrder(input: JokiEligibilityInput): boolean {
  return isJokiAvailableForWork(input)
    && input.peakAbsoluteStar >= input.targetAbsoluteStar
    && input.serviceModes.includes(input.orderServiceMode);
}

export type TelegramJokiEligibilityInput = JokiEligibilityInput & { telegramUserId: string | null };

export function isTelegramJokiEligibleForOrder(input: TelegramJokiEligibilityInput): boolean {
  return Boolean(input.telegramUserId) && isJokiEligibleForOrder(input);
}
