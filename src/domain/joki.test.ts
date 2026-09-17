import { describe, expect, it } from "vitest";
import { isJokiAvailableForWork, isJokiEligibleForOrder, isTelegramJokiEligibleForOrder } from "@/domain/joki";

const eligible = {
  status: "ACTIVE" as const,
  availability: "AVAILABLE" as const,
  peakAbsoluteStar: 50,
  targetAbsoluteStar: 50,
  hasActiveAssignment: false,
  serviceModes: ["ACCOUNT"] as const,
  orderServiceMode: "ACCOUNT" as const,
};

describe("joki eligibility", () => {
  it("requires an active, available joki with sufficient peak and no active job", () => {
    expect(isJokiEligibleForOrder(eligible)).toBe(true);
    expect(isJokiEligibleForOrder({ ...eligible, status: "INACTIVE" })).toBe(false);
    expect(isJokiEligibleForOrder({ ...eligible, availability: "OFFLINE" })).toBe(false);
    expect(isJokiEligibleForOrder({ ...eligible, availability: "BUSY" })).toBe(false);
    expect(isJokiEligibleForOrder({ ...eligible, peakAbsoluteStar: 49 })).toBe(false);
    expect(isJokiEligibleForOrder({ ...eligible, hasActiveAssignment: true })).toBe(false);
  });

  it("matches account-only, gendong-only, and dual-mode capabilities", () => {
    expect(isJokiEligibleForOrder(eligible)).toBe(true);
    expect(isJokiEligibleForOrder({ ...eligible, orderServiceMode: "GENDONG" })).toBe(false);
    expect(isJokiEligibleForOrder({ ...eligible, serviceModes: ["GENDONG"], orderServiceMode: "GENDONG" })).toBe(true);
    expect(isJokiEligibleForOrder({ ...eligible, serviceModes: ["GENDONG"], orderServiceMode: "ACCOUNT" })).toBe(false);
    expect(isJokiEligibleForOrder({ ...eligible, serviceModes: ["ACCOUNT", "GENDONG"], orderServiceMode: "ACCOUNT" })).toBe(true);
    expect(isJokiEligibleForOrder({ ...eligible, serviceModes: ["ACCOUNT", "GENDONG"], orderServiceMode: "GENDONG" })).toBe(true);
  });

  it("exposes the mode-independent availability boundary for job listing", () => {
    expect(isJokiAvailableForWork(eligible)).toBe(true);
    expect(isJokiAvailableForWork({ ...eligible, hasActiveAssignment: true })).toBe(false);
  });

  it("requires a linked Telegram identity and matching mode for job-pool eligibility", () => {
    expect(isTelegramJokiEligibleForOrder({ ...eligible, telegramUserId: "123456789" })).toBe(true);
    expect(isTelegramJokiEligibleForOrder({ ...eligible, telegramUserId: null })).toBe(false);
    expect(isTelegramJokiEligibleForOrder({ ...eligible, telegramUserId: "123456789", orderServiceMode: "GENDONG" })).toBe(false);
  });
});
