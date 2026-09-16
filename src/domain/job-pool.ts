import type { OrderStatus, PaymentStatus } from "@/generated/prisma/client";
import { validateJokiAssignment, type JokiAssignmentContext } from "@/domain/assignment";

export class JobPoolError extends Error {}

export function validateJobPublication(input: {
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  hasActiveAssignment: boolean;
  hasOpenPosting: boolean;
}): void {
  if (input.paymentStatus !== "PAID") throw new JobPoolError("Pembayaran pesanan belum diterima.");
  if (input.orderStatus !== "WAITING_JOKI") throw new JobPoolError("Pesanan belum siap dipublish ke Job Pool.");
  if (input.hasActiveAssignment) throw new JobPoolError("Pesanan sudah memiliki penugasan aktif.");
  if (input.hasOpenPosting) throw new JobPoolError("Pesanan sudah memiliki Job Pool terbuka.");
}

export function validateTelegramJobClaim(context: JokiAssignmentContext): void {
  validateJokiAssignment(context);
}

export function canStartTelegramJob(orderStatus: OrderStatus): boolean {
  return orderStatus === "ASSIGNED";
}

export function getSuccessfulJobClaimState(jobStatus: "OPEN" | "CLAIMED" | "CANCELLED") {
  if (jobStatus !== "OPEN") throw new JobPoolError("Job sudah diambil atau tidak lagi tersedia.");
  return {
    jobStatus: "CLAIMED" as const,
    assignmentStatus: "ACTIVE" as const,
    jokiAvailability: "BUSY" as const,
    orderStatus: "ASSIGNED" as const,
  };
}

export function getManualAssignmentJobPostingUpdate() {
  return { jobStatus: "CANCELLED" as const };
}

export function getOpenJobCancellationState(jobStatus: "OPEN" | "CLAIMED" | "CANCELLED") {
  if (jobStatus !== "OPEN") throw new JobPoolError("Job sudah tidak tersedia untuk dibatalkan.");
  return { jobStatus: "CANCELLED" as const };
}

export function getTelegramStartState(orderStatus: OrderStatus): { started: false } | { started: true; orderStatus: "IN_PROGRESS" } {
  if (orderStatus === "IN_PROGRESS") return { started: false };
  if (!canStartTelegramJob(orderStatus)) throw new JobPoolError("Job belum dapat dimulai.");
  return { started: true, orderStatus: "IN_PROGRESS" };
}
