import { describe, expect, it } from "vitest";
import {
  canMoveOrderToStatus,
  canTransitionOrderStatus,
  getAllowedOrderStatusTransitions,
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
});
