import { describe, expect, it } from "vitest";
import { getManualAssignmentJobPostingUpdate, getOpenJobCancellationState, getSuccessfulJobClaimState, getTelegramStartState, JobPoolError, canStartTelegramJob, validateJobPublication } from "@/domain/job-pool";

describe("job pool publication", () => {
  const valid = { orderStatus: "WAITING_JOKI" as const, paymentStatus: "PAID" as const, hasActiveAssignment: false, hasOpenPosting: false };

  it("accepts a paid waiting order", () => {
    expect(() => validateJobPublication(valid)).not.toThrow();
  });

  it("rejects unpaid, wrong-status, assigned, or already-open orders", () => {
    expect(() => validateJobPublication({ ...valid, paymentStatus: "PENDING" })).toThrow(JobPoolError);
    expect(() => validateJobPublication({ ...valid, orderStatus: "PAID" })).toThrow(JobPoolError);
    expect(() => validateJobPublication({ ...valid, hasActiveAssignment: true })).toThrow(JobPoolError);
    expect(() => validateJobPublication({ ...valid, hasOpenPosting: true })).toThrow(JobPoolError);
  });
});

describe("Telegram start-job boundary", () => {
  it("only permits the assigned state", () => {
    expect(canStartTelegramJob("ASSIGNED")).toBe(true);
    expect(canStartTelegramJob("IN_PROGRESS")).toBe(false);
  });
});

describe("job and assignment lifecycle state", () => {
  it("has one successful claim outcome", () => {
    expect(getSuccessfulJobClaimState("OPEN")).toEqual({ jobStatus: "CLAIMED", assignmentStatus: "ACTIVE", jokiAvailability: "BUSY", orderStatus: "ASSIGNED" });
    expect(() => getSuccessfulJobClaimState("CLAIMED")).toThrow(JobPoolError);
  });

  it("closes an open job for manual assignment and leaves cancellation order-neutral", () => {
    expect(getManualAssignmentJobPostingUpdate()).toEqual({ jobStatus: "CANCELLED" });
    expect(getOpenJobCancellationState("OPEN")).toEqual({ jobStatus: "CANCELLED" });
    expect(() => getOpenJobCancellationState("CLAIMED")).toThrow(JobPoolError);
  });

  it("starts once and treats an already-started order as idempotent", () => {
    expect(getTelegramStartState("ASSIGNED")).toEqual({ started: true, orderStatus: "IN_PROGRESS" });
    expect(getTelegramStartState("IN_PROGRESS")).toEqual({ started: false });
  });
});
