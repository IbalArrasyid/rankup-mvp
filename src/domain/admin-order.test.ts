import { describe, expect, it } from "vitest";
import {
  getPaymentConfirmationUpdate,
  ProgressUpdateError,
  validateProgressUpdate,
} from "@/domain/admin-order";

describe("admin progress updates", () => {
  it("accepts a valid progress increase", () => {
    expect(validateProgressUpdate(25, 32, 50, 38)).toEqual({ changed: true, nextAbsoluteStar: 38 });
  });

  it("rejects values below the initial position, above target, and regressions", () => {
    expect(() => validateProgressUpdate(25, 32, 50, 24)).toThrow(ProgressUpdateError);
    expect(() => validateProgressUpdate(25, 32, 50, 51)).toThrow(ProgressUpdateError);
    expect(() => validateProgressUpdate(25, 32, 50, 31)).toThrow(ProgressUpdateError);
  });

  it("treats the same progress as unchanged", () => {
    expect(validateProgressUpdate(25, 32, 50, 32)).toEqual({ changed: false, nextAbsoluteStar: 32 });
  });
});

describe("manual payment confirmation", () => {
  it("moves an awaiting payment order to paid", () => {
    expect(getPaymentConfirmationUpdate("AWAITING_PAYMENT", "PENDING")).toEqual({
      changed: true,
      nextStatus: "PAID",
      nextPaymentStatus: "PAID",
    });
  });

  it("is idempotent for an already paid order", () => {
    expect(getPaymentConfirmationUpdate("PAID", "PAID")).toEqual({
      changed: false,
      nextStatus: "PAID",
      nextPaymentStatus: "PAID",
    });
  });
});
