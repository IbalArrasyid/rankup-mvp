import type { OrderStatus, PaymentStatus } from "@/generated/prisma/client";

const transitions = {
  AWAITING_PAYMENT: ["PAID"],
  PAID: ["WAITING_JOKI"],
  WAITING_JOKI: ["ASSIGNED"],
  ASSIGNED: ["IN_PROGRESS"],
  IN_PROGRESS: ["PAUSED", "QC"],
  PAUSED: ["IN_PROGRESS"],
  QC: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  REFUND_REQUESTED: [],
  REFUNDED: [],
} as const satisfies Record<OrderStatus, readonly OrderStatus[]>;

const paidOnlyStatuses: readonly OrderStatus[] = [
  "PAID",
  "WAITING_JOKI",
  "ASSIGNED",
  "IN_PROGRESS",
  "PAUSED",
  "QC",
  "COMPLETED",
];

export function getAllowedOrderStatusTransitions(status: OrderStatus): readonly OrderStatus[] {
  return transitions[status];
}

export function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus): boolean {
  return getAllowedOrderStatusTransitions(from).includes(to);
}

export function canMoveOrderToStatus(
  from: OrderStatus,
  paymentStatus: PaymentStatus,
  to: OrderStatus,
): boolean {
  if (!canTransitionOrderStatus(from, to)) return false;
  return !paidOnlyStatuses.includes(to) || paymentStatus === "PAID";
}

export type OrderTransitionContext = {
  currentStatus: OrderStatus;
  nextStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  progressAbsoluteStar: number;
  targetAbsoluteStar: number;
  hasActiveAssignment: boolean;
};

export class OrderTransitionError extends Error {}

const assignmentBoundStatuses: readonly OrderStatus[] = ["ASSIGNED", "IN_PROGRESS", "PAUSED", "QC"];

export function validateOrderTransition(context: OrderTransitionContext): void {
  const {
    currentStatus,
    nextStatus,
    paymentStatus,
    progressAbsoluteStar,
    targetAbsoluteStar,
    hasActiveAssignment,
  } = context;

  if (!canMoveOrderToStatus(currentStatus, paymentStatus, nextStatus)) {
    throw new OrderTransitionError("Perubahan status tersebut tidak diizinkan.");
  }
  if (assignmentBoundStatuses.includes(currentStatus) && !hasActiveAssignment) {
    throw new OrderTransitionError("Pesanan membutuhkan penugasan joki aktif.");
  }
  if (nextStatus === "ASSIGNED" && !hasActiveAssignment) {
    throw new OrderTransitionError("Pesanan hanya dapat ditugaskan melalui penugasan joki aktif.");
  }
  if (nextStatus === "IN_PROGRESS" && !hasActiveAssignment) {
    throw new OrderTransitionError("Pengerjaan membutuhkan penugasan joki aktif.");
  }
  if (nextStatus === "QC" && progressAbsoluteStar !== targetAbsoluteStar) {
    throw new OrderTransitionError("Target bintang belum tercapai.");
  }
  if (nextStatus === "QC" && !hasActiveAssignment) {
    throw new OrderTransitionError("QC membutuhkan penugasan joki aktif.");
  }
  if (nextStatus === "COMPLETED" && progressAbsoluteStar !== targetAbsoluteStar) {
    throw new OrderTransitionError("Target bintang belum tercapai.");
  }
  if (nextStatus === "COMPLETED" && !hasActiveAssignment) {
    throw new OrderTransitionError("Penyelesaian membutuhkan penugasan joki aktif.");
  }
}

export function getAllowedGenericOrderStatusTransitions(
  context: Omit<OrderTransitionContext, "nextStatus">,
): readonly OrderStatus[] {
  return getAllowedOrderStatusTransitions(context.currentStatus).filter((nextStatus) => {
    if (nextStatus === "ASSIGNED") return false;
    try {
      validateOrderTransition({ ...context, nextStatus });
      return true;
    } catch (error) {
      if (error instanceof OrderTransitionError) return false;
      throw error;
    }
  });
}
