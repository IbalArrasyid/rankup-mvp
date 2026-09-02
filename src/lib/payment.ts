import type { Order } from "@/generated/prisma/client";

export type PaymentInstruction = {
  provider: "manual";
  status: "PENDING";
  amount: number;
  message: string;
};

export interface PaymentProvider {
  createPayment(order: Pick<Order, "publicId" | "total">): Promise<PaymentInstruction>;
  getPaymentStatus(orderPublicId: string): Promise<"PENDING">;
  handleWebhook(payload: unknown): Promise<void>;
}

export class ManualPaymentProvider implements PaymentProvider {
  async createPayment(order: Pick<Order, "publicId" | "total">): Promise<PaymentInstruction> {
    return {
      provider: "manual",
      status: "PENDING",
      amount: order.total,
      message: `Pembayaran untuk pesanan ${order.publicId} menunggu instruksi manual.`,
    };
  }

  async getPaymentStatus(): Promise<"PENDING"> {
    return "PENDING";
  }

  async handleWebhook(): Promise<void> {
    // Provider manual does not receive webhooks. Future providers implement this boundary.
  }
}

export const paymentProvider: PaymentProvider = new ManualPaymentProvider();
