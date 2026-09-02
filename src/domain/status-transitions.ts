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
