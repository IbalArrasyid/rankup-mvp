import type { JokiAvailability, JokiRole, JokiStatus } from "@/generated/prisma/client";

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

export type JokiEligibilityInput = {
  status: JokiStatus;
  availability: JokiAvailability;
  peakAbsoluteStar: number;
  targetAbsoluteStar: number;
  hasActiveAssignment: boolean;
};

export function isJokiEligibleForOrder(input: JokiEligibilityInput): boolean {
  return input.status === "ACTIVE"
    && input.availability === "AVAILABLE"
    && !input.hasActiveAssignment
    && input.peakAbsoluteStar >= input.targetAbsoluteStar;
}

export type TelegramJokiEligibilityInput = JokiEligibilityInput & { telegramUserId: string | null };

export function isTelegramJokiEligibleForOrder(input: TelegramJokiEligibilityInput): boolean {
  return Boolean(input.telegramUserId) && isJokiEligibleForOrder(input);
}
