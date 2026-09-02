export const ORDER_STATUS_META = {
  AWAITING_PAYMENT: { label: "Menunggu Pembayaran", tone: "amber" },
  PAID: { label: "Pembayaran Diterima", tone: "emerald" },
  WAITING_JOKI: { label: "Mencari Joki", tone: "violet" },
  ASSIGNED: { label: "Joki Ditugaskan", tone: "blue" },
  IN_PROGRESS: { label: "Sedang Dikerjakan", tone: "cyan" },
  PAUSED: { label: "Dijeda", tone: "slate" },
  QC: { label: "Pengecekan Akhir", tone: "blue" },
  COMPLETED: { label: "Selesai", tone: "emerald" },
  CANCELLED: { label: "Dibatalkan", tone: "rose" },
  REFUND_REQUESTED: { label: "Pengembalian Dana Diproses", tone: "amber" },
  REFUNDED: { label: "Dana Dikembalikan", tone: "slate" },
} as const;

export const PAYMENT_STATUS_META = {
  PENDING: { label: "Menunggu Pembayaran", tone: "amber" },
  PAID: { label: "Sudah Dibayar", tone: "emerald" },
  FAILED: { label: "Pembayaran Gagal", tone: "rose" },
  EXPIRED: { label: "Pembayaran Kedaluwarsa", tone: "slate" },
  REFUNDED: { label: "Dana Dikembalikan", tone: "slate" },
} as const;

export type OrderStatusKey = keyof typeof ORDER_STATUS_META;
export type PaymentStatusKey = keyof typeof PAYMENT_STATUS_META;
