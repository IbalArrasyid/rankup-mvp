import { describe, expect, it } from "vitest";
import { getAdminAssignmentUiState, shouldFetchEligibleJokis } from "@/domain/admin-assignment-ui";

describe("admin assignment detail UI", () => {
  it("shows assignment options for a paid WAITING_JOKI order with eligible jokis", () => {
    const state = getAdminAssignmentUiState({
      status: "WAITING_JOKI", paymentStatus: "PAID", eligibleJokiCount: 1, hasActiveAssignment: false, hasCompletedAssignment: false,
    });

    expect(shouldFetchEligibleJokis("WAITING_JOKI", "PAID")).toBe(true);
    expect(state).toMatchObject({ mode: "waiting", showAssignmentSection: true, showAssignmentForm: true, showEmptyState: false });
  });

  it("shows the waiting-order empty state when no eligible joki is returned", () => {
    expect(getAdminAssignmentUiState({
      status: "WAITING_JOKI", paymentStatus: "PAID", eligibleJokiCount: 0, hasActiveAssignment: false, hasCompletedAssignment: false,
    })).toMatchObject({ mode: "waiting", showAssignmentSection: true, showAssignmentForm: false, showEmptyState: true });
  });

  it("keeps the assignment form unavailable until a PAID order moves to WAITING_JOKI", () => {
    expect(shouldFetchEligibleJokis("PAID", "PAID")).toBe(false);
    expect(getAdminAssignmentUiState({
      status: "PAID", paymentStatus: "PAID", eligibleJokiCount: 1, hasActiveAssignment: false, hasCompletedAssignment: false,
    })).toMatchObject({ mode: "paid", showAssignmentForm: false });
  });

  it("shows an existing active assignment without a duplicate assignment form", () => {
    expect(getAdminAssignmentUiState({
      status: "ASSIGNED", paymentStatus: "PAID", eligibleJokiCount: 1, hasActiveAssignment: true, hasCompletedAssignment: false,
    })).toMatchObject({ mode: "active", showActiveAssignment: true, showAssignmentForm: false });
  });
});
