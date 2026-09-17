import { describe, expect, it } from "vitest";
import {
  AssignmentLifecycleError,
  getCompletionAssignmentUpdate,
  getUnassignmentUpdate,
  validateJokiAssignment,
} from "@/domain/assignment";

const eligibleJoki = {
  status: "ACTIVE" as const,
  availability: "AVAILABLE" as const,
  peakAbsoluteStar: 70,
  hasActiveAssignment: false,
  serviceModes: ["ACCOUNT"] as const,
};

function assignmentContext() {
  return {
    order: {
      status: "WAITING_JOKI" as const,
      paymentStatus: "PAID" as const,
      targetAbsoluteStar: 50,
      serviceMode: "ACCOUNT" as const,
      hasActiveAssignment: false,
    },
    joki: eligibleJoki,
  };
}

describe("manual joki assignment rules", () => {
  it("accepts a paid waiting order and an eligible available joki", () => {
    expect(() => validateJokiAssignment(assignmentContext())).not.toThrow();
  });

  it.each([
    [{ ...eligibleJoki, status: "INACTIVE" as const }, "inactive"],
    [{ ...eligibleJoki, availability: "OFFLINE" as const }, "offline"],
    [{ ...eligibleJoki, availability: "BUSY" as const }, "busy"],
    [{ ...eligibleJoki, peakAbsoluteStar: 49 }, "peak below target"],
    [{ ...eligibleJoki, hasActiveAssignment: true }, "existing active job"],
  ])("rejects an ineligible joki: %s", (joki, _description) => {
    expect(() => validateJokiAssignment({ ...assignmentContext(), joki })).toThrow(AssignmentLifecycleError);
  });

  it("rejects an order that already has an active assignment", () => {
    const context = assignmentContext();
    context.order.hasActiveAssignment = true;
    expect(() => validateJokiAssignment(context)).toThrow("Pesanan sudah memiliki penugasan aktif.");
  });

  it("enforces service-mode capability server-side", () => {
    const context = assignmentContext();
    expect(() => validateJokiAssignment({
      ...context,
      order: { ...context.order, serviceMode: "GENDONG" },
    })).toThrow(AssignmentLifecycleError);
    expect(() => validateJokiAssignment({
      ...context,
      order: { ...context.order, serviceMode: "GENDONG" },
      joki: { ...context.joki, serviceModes: ["ACCOUNT", "GENDONG"] },
    })).not.toThrow();
  });

  it("rejects an unpaid or non-waiting order", () => {
    const unpaid = assignmentContext();
    expect(() => validateJokiAssignment({ ...unpaid, order: { ...unpaid.order, paymentStatus: "PENDING" } })).toThrow(AssignmentLifecycleError);

    const assigned = assignmentContext();
    expect(() => validateJokiAssignment({ ...assigned, order: { ...assigned.order, status: "ASSIGNED" } })).toThrow(AssignmentLifecycleError);
  });
});

describe("assignment lifecycle updates", () => {
  it("returns an unassigned order to WAITING_JOKI and releases the joki", () => {
    expect(getUnassignmentUpdate("IN_PROGRESS", true)).toEqual({
      orderStatus: "WAITING_JOKI",
      assignmentStatus: "CANCELLED",
      jokiAvailability: "AVAILABLE",
    });
  });

  it("completes the active assignment and releases the joki", () => {
    expect(getCompletionAssignmentUpdate(true)).toEqual({
      assignmentStatus: "COMPLETED",
      jokiAvailability: "AVAILABLE",
    });
  });
});
