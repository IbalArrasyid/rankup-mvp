import type { JokiAvailability, OrderAssignmentStatus, OrderStatus, PaymentStatus } from "@/generated/prisma/client";
import { isJokiEligibleForOrder, type JokiEligibilityInput } from "@/domain/joki";

export class AssignmentLifecycleError extends Error {}

export type JokiAssignmentContext = {
  order: {
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    targetAbsoluteStar: number;
    hasActiveAssignment: boolean;
  };
  joki: Omit<JokiEligibilityInput, "targetAbsoluteStar">;
};

export function validateJokiAssignment(context: JokiAssignmentContext): void {
  const { order, joki } = context;
  if (order.paymentStatus !== "PAID") {
    throw new AssignmentLifecycleError("Pembayaran pesanan belum diterima.");
  }
  if (order.status !== "WAITING_JOKI") {
    throw new AssignmentLifecycleError("Pesanan belum siap ditugaskan.");
  }
  if (order.hasActiveAssignment) {
    throw new AssignmentLifecycleError("Pesanan sudah memiliki penugasan aktif.");
  }
  if (joki.hasActiveAssignment) {
    throw new AssignmentLifecycleError("Joki masih menangani pesanan aktif.");
  }
  if (!isJokiEligibleForOrder({ ...joki, targetAbsoluteStar: order.targetAbsoluteStar })) {
    throw new AssignmentLifecycleError("Joki tidak memenuhi syarat untuk pesanan ini.");
  }
}

export function getUnassignmentUpdate(
  orderStatus: OrderStatus,
  hasActiveAssignment: boolean,
): { orderStatus: "WAITING_JOKI"; assignmentStatus: "CANCELLED"; jokiAvailability: JokiAvailability } {
  if (!(["ASSIGNED", "IN_PROGRESS", "PAUSED"] as const).includes(orderStatus)) {
    throw new AssignmentLifecycleError("Penugasan tidak dapat dibatalkan pada status ini.");
  }
  if (!hasActiveAssignment) {
    throw new AssignmentLifecycleError("Tidak ada penugasan aktif untuk dibatalkan.");
  }
  return { orderStatus: "WAITING_JOKI", assignmentStatus: "CANCELLED", jokiAvailability: "AVAILABLE" };
}

export function getCompletionAssignmentUpdate(
  hasActiveAssignment: boolean,
): { assignmentStatus: OrderAssignmentStatus; jokiAvailability: JokiAvailability } {
  if (!hasActiveAssignment) {
    throw new AssignmentLifecycleError("Penyelesaian membutuhkan penugasan joki aktif.");
  }
  return { assignmentStatus: "COMPLETED", jokiAvailability: "AVAILABLE" };
}
