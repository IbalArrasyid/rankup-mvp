import type { OrderStatus, PaymentStatus } from "@/generated/prisma/client";

export class ProgressUpdateError extends Error {}

export function validateProgressUpdate(
  initialAbsoluteStar: number,
  currentAbsoluteStar: number,
  targetAbsoluteStar: number,
  nextAbsoluteStar: number,
): { changed: boolean; nextAbsoluteStar: number } {
  if (!Number.isInteger(nextAbsoluteStar)) {
    throw new ProgressUpdateError("Progress harus berupa jumlah bintang bulat.");
  }
  if (nextAbsoluteStar < initialAbsoluteStar) {
    throw new ProgressUpdateError("Progress tidak boleh di bawah bintang awal pesanan.");
  }
  if (nextAbsoluteStar > targetAbsoluteStar) {
    throw new ProgressUpdateError("Progress tidak boleh melebihi target pesanan.");
  }
  if (nextAbsoluteStar < currentAbsoluteStar) {
    throw new ProgressUpdateError("Progress tidak boleh mundur.");
  }

  return { changed: nextAbsoluteStar !== currentAbsoluteStar, nextAbsoluteStar };
}

export function getPaymentConfirmationUpdate(
  status: OrderStatus,
  paymentStatus: PaymentStatus,
): { changed: boolean; nextStatus: OrderStatus; nextPaymentStatus: PaymentStatus } {
  if (paymentStatus === "PAID") {
    return { changed: false, nextStatus: status, nextPaymentStatus: paymentStatus };
  }

  return {
    changed: true,
    nextStatus: status === "AWAITING_PAYMENT" ? "PAID" : status,
    nextPaymentStatus: "PAID",
  };
}
