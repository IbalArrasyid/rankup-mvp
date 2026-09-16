import type { OrderStatus, PaymentStatus } from "@/generated/prisma/client";

export type AdminAssignmentUiState = {
  mode: "waiting" | "paid" | "active" | "completed" | "none";
  showAssignmentSection: boolean;
  showAssignmentForm: boolean;
  showEmptyState: boolean;
  showActiveAssignment: boolean;
  showCompletedAssignment: boolean;
  requiresPayment: boolean;
};

export function shouldFetchEligibleJokis(status: OrderStatus, paymentStatus: PaymentStatus): boolean {
  return status === "WAITING_JOKI" && paymentStatus === "PAID";
}

export function getAdminAssignmentUiState(input: {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  eligibleJokiCount: number;
  hasActiveAssignment: boolean;
  hasCompletedAssignment: boolean;
}): AdminAssignmentUiState {
  if (input.status === "WAITING_JOKI") {
    const eligibleJokisFetched = shouldFetchEligibleJokis(input.status, input.paymentStatus);
    return {
      mode: "waiting",
      showAssignmentSection: true,
      showAssignmentForm: eligibleJokisFetched && input.eligibleJokiCount > 0,
      showEmptyState: eligibleJokisFetched && input.eligibleJokiCount === 0,
      showActiveAssignment: false,
      showCompletedAssignment: false,
      requiresPayment: !eligibleJokisFetched,
    };
  }

  if (input.status === "PAID") {
    return { mode: "paid", showAssignmentSection: false, showAssignmentForm: false, showEmptyState: false, showActiveAssignment: false, showCompletedAssignment: false, requiresPayment: false };
  }

  if ((["ASSIGNED", "IN_PROGRESS", "PAUSED"] as readonly string[]).includes(input.status)) {
    return { mode: "active", showAssignmentSection: false, showAssignmentForm: false, showEmptyState: false, showActiveAssignment: input.hasActiveAssignment, showCompletedAssignment: false, requiresPayment: false };
  }

  if (input.status === "COMPLETED") {
    return { mode: "completed", showAssignmentSection: false, showAssignmentForm: false, showEmptyState: false, showActiveAssignment: false, showCompletedAssignment: input.hasCompletedAssignment, requiresPayment: false };
  }

  return { mode: "none", showAssignmentSection: false, showAssignmentForm: false, showEmptyState: false, showActiveAssignment: false, showCompletedAssignment: false, requiresPayment: false };
}
