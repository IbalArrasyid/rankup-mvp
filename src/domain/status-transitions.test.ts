import { describe, expect, it } from "vitest";
import {
  canMoveOrderToStatus,
  canTransitionOrderStatus,
  getAllowedGenericOrderStatusTransitions,
  getAllowedOrderStatusTransitions,
  OrderTransitionError,
  validateOrderTransition,
} from "@/domain/status-transitions";

describe("admin order status transitions", () => {
  it("permits the designed operational flow", () => {
    expect(getAllowedOrderStatusTransitions("AWAITING_PAYMENT")).toEqual(["PAID"]);
    expect(canTransitionOrderStatus("PAID", "WAITING_JOKI")).toBe(true);
    expect(canTransitionOrderStatus("IN_PROGRESS", "QC")).toBe(true);
    expect(canTransitionOrderStatus("PAUSED", "IN_PROGRESS")).toBe(true);
  });

  it("rejects arbitrary or backwards transitions", () => {
    expect(canTransitionOrderStatus("AWAITING_PAYMENT", "WAITING_JOKI")).toBe(false);
    expect(canTransitionOrderStatus("COMPLETED", "AWAITING_PAYMENT")).toBe(false);
    expect(canTransitionOrderStatus("QC", "IN_PROGRESS")).toBe(false);
  });

  it("does not permit processing an unpaid order", () => {
    expect(canMoveOrderToStatus("AWAITING_PAYMENT", "PENDING", "PAID")).toBe(false);
    expect(canMoveOrderToStatus("PAID", "PENDING", "WAITING_JOKI")).toBe(false);
    expect(canMoveOrderToStatus("PAID", "PAID", "WAITING_JOKI")).toBe(true);
  });

  it("keeps ASSIGNED out of the generic status controls", () => {
    expect(getAllowedGenericOrderStatusTransitions({
      currentStatus: "WAITING_JOKI", paymentStatus: "PAID", progressAbsoluteStar: 25, targetAbsoluteStar: 50, hasActiveAssignment: false,
    })).not.toContain("ASSIGNED");
  });

  it("requires an active assignment for operational state changes", () => {
    expect(() => validateOrderTransition({
      currentStatus: "ASSIGNED", nextStatus: "IN_PROGRESS", paymentStatus: "PAID", progressAbsoluteStar: 25, targetAbsoluteStar: 50, hasActiveAssignment: false,
    })).toThrow(OrderTransitionError);
  });

  it("requires the target before QC or completion", () => {
    expect(() => validateOrderTransition({
      currentStatus: "IN_PROGRESS", nextStatus: "QC", paymentStatus: "PAID", progressAbsoluteStar: 49, targetAbsoluteStar: 50, hasActiveAssignment: true,
    })).toThrow("Target bintang belum tercapai.");
    expect(() => validateOrderTransition({
      currentStatus: "QC", nextStatus: "COMPLETED", paymentStatus: "PAID", progressAbsoluteStar: 50, targetAbsoluteStar: 50, hasActiveAssignment: true,
    })).not.toThrow();
  });
});
