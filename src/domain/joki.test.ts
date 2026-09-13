import { describe, expect, it } from "vitest";
import { isJokiEligibleForOrder } from "@/domain/joki";

const eligible = {
  status: "ACTIVE" as const,
  availability: "AVAILABLE" as const,
  peakAbsoluteStar: 50,
  targetAbsoluteStar: 50,
  hasActiveAssignment: false,
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
});
