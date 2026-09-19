import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class MockDokuCheckoutError extends Error {
    constructor(readonly diagnostic: unknown) { super("DOKU checkout failed"); }
  }
  return {
  orderFindUnique: vi.fn(),
  attemptFindFirst: vi.fn(),
  attemptCreate: vi.fn(),
  attemptUpdate: vi.fn(),
  transaction: vi.fn(),
  checkout: vi.fn(),
    callbackBaseUrl: vi.fn(),
    DokuCheckoutError: MockDokuCheckoutError,
  };
});

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    order: { findUnique: mocks.orderFindUnique },
    paymentAttempt: { findFirst: mocks.attemptFindFirst, create: mocks.attemptCreate, update: mocks.attemptUpdate },
    $transaction: mocks.transaction,
  }),
}));
vi.mock("@/lib/doku/client", () => ({ createDokuQrisCheckout: mocks.checkout, DokuCheckoutError: mocks.DokuCheckoutError }));
vi.mock("@/lib/doku/config", () => ({ getDokuCallbackBaseUrl: mocks.callbackBaseUrl }));

import { PaymentError, applyDokuNotification, createPaymentCheckout } from "@/server/payments";

const order = { id: "order-1", publicId: "ML-260919-ABCD", customerName: "Raka", email: null, whatsapp: "6281234567890", total: 184_500, currency: "IDR", paymentStatus: "PENDING" };
const notification = { invoiceNumber: "PAY-260919-ABCD", amount: 184_500, currency: "IDR", transactionStatus: "SUCCESS", providerPaymentId: "doku-payment" };

function configureCheckout() {
  mocks.orderFindUnique.mockResolvedValue(order);
  mocks.attemptFindFirst.mockResolvedValue(null);
  mocks.attemptCreate.mockResolvedValue({ id: "attempt-1", publicId: "PAY-260919-ABCD" });
  mocks.attemptUpdate.mockResolvedValue({});
  mocks.callbackBaseUrl.mockReturnValue("https://app.example.test");
  mocks.checkout.mockResolvedValue({ checkoutUrl: "https://checkout.example.test/qris", requestId: "request-1", providerPaymentId: "doku-payment", expiresAt: new Date("2026-09-19T12:00:00Z") });
}

describe("PaymentAttempt Checkout service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureCheckout();
  });

  it("creates an unpaid QRIS attempt from the persisted order total", async () => {
    const result = await createPaymentCheckout(order.publicId);

    expect(result).toEqual({ checkoutUrl: "https://checkout.example.test/qris", reused: false });
    expect(mocks.attemptCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ amount: 184_500, currency: "IDR", provider: "DOKU", method: "QRIS" }) }));
    expect(mocks.checkout).toHaveBeenCalledWith(expect.objectContaining({ amount: 184_500 }));
    expect(mocks.attemptUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ checkoutUrl: "https://checkout.example.test/qris" }) }));
  });

  it("has no browser amount input that can override the persisted total", async () => {
    await (createPaymentCheckout as unknown as (publicId: string, browserAmount: number) => Promise<unknown>)(order.publicId, 1);
    expect(mocks.checkout).toHaveBeenCalledWith(expect.objectContaining({ amount: order.total }));
  });

  it("reuses an active Checkout URL instead of creating a duplicate attempt", async () => {
    mocks.attemptFindFirst.mockResolvedValue({ id: "attempt-1", status: "PENDING", checkoutUrl: "https://checkout.example.test/existing", expiresAt: new Date("2099-01-01T00:00:00Z") });
    await expect(createPaymentCheckout(order.publicId)).resolves.toEqual({ checkoutUrl: "https://checkout.example.test/existing", reused: true });
    expect(mocks.attemptCreate).not.toHaveBeenCalled();
    expect(mocks.checkout).not.toHaveBeenCalled();
  });

  it("expires a stale attempt before creating a fresh QRIS attempt", async () => {
    mocks.attemptFindFirst.mockResolvedValue({ id: "attempt-old", status: "PENDING", checkoutUrl: "https://checkout.example.test/old", expiresAt: new Date("2000-01-01T00:00:00Z") });
    await createPaymentCheckout(order.publicId);
    expect(mocks.attemptUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "attempt-old" }, data: expect.objectContaining({ status: "EXPIRED" }) }));
    expect(mocks.attemptCreate).toHaveBeenCalledTimes(1);
  });

  it("does not create an actionable payment after the order is paid", async () => {
    mocks.orderFindUnique.mockResolvedValue({ ...order, paymentStatus: "PAID" });
    await expect(createPaymentCheckout(order.publicId)).rejects.toBeInstanceOf(PaymentError);
    expect(mocks.attemptCreate).not.toHaveBeenCalled();
  });

  it("records a provider 400 as CREATE_FAILED without marking the order paid or logging secrets", async () => {
    const diagnostic = { environment: "sandbox", endpointHost: "api-sandbox.doku.com", requestTarget: "/checkout/v1/payment", httpStatus: 400, dokuMessage: "QRIS is not available", requestId: "request-1", invoiceNumber: "PAY-260919-ABCD", amount: 184_500, currency: "IDR", paymentMethodTypes: ["QRIS"] };
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.checkout.mockRejectedValue(new mocks.DokuCheckoutError(diagnostic));
    await expect(createPaymentCheckout(order.publicId)).rejects.toThrow("DOKU checkout failed");
    expect(mocks.attemptUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "FAILED" }) }));
    expect(mocks.orderFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { publicId: order.publicId } }));
    expect(errorLog).toHaveBeenCalledWith(expect.objectContaining({ event: "doku-checkout-failed", httpStatus: 400, dokuMessage: "QRIS is not available", paymentAttemptPublicId: "PAY-260919-ABCD", orderPublicId: order.publicId }));
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("test-secret");
    errorLog.mockRestore();
  });
});

type PaymentState = { attempt: { id: string; orderId: string; publicId: string; status: string; amount: number; currency: string; providerPaymentId: string | null; order: { id: string; total: number; currency: string; paymentStatus: string; status: string } } | null; otherAttempts: { id: string; status: string }[]; events: unknown[] };

function configureNotification(state: PaymentState) {
  const tx = {
    paymentAttempt: {
      findUnique: vi.fn().mockImplementation(() => Promise.resolve(state.attempt)),
      updateMany: vi.fn(async ({ where, data }: { where: { id?: string; orderId?: string; status: string }; data: { status: string; paidAt?: Date; providerPaymentId?: string | null } }) => {
        if (where.id && state.attempt?.id === where.id) {
          if (state.attempt.status !== "PENDING") return { count: 0 };
          Object.assign(state.attempt, data);
          return { count: 1 };
        }
        if (where.orderId && state.attempt?.orderId === where.orderId) {
          for (const attempt of state.otherAttempts) if (attempt.status === "PENDING") attempt.status = data.status;
        }
        return { count: 1 };
      }),
    },
    order: {
      updateMany: vi.fn(async () => {
        if (!state.attempt || state.attempt.order.paymentStatus === "PAID") return { count: 0 };
        state.attempt.order.paymentStatus = "PAID";
        if (state.attempt.order.status === "AWAITING_PAYMENT") state.attempt.order.status = "PAID";
        return { count: 1 };
      }),
    },
    orderEvent: { create: vi.fn(async ({ data }: { data: unknown }) => { state.events.push(data); return {}; }) },
  };
  mocks.transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx));
}

function pendingState(): PaymentState {
  return { attempt: { id: "attempt-1", orderId: "order-1", publicId: "PAY-260919-ABCD", status: "PENDING", amount: 184_500, currency: "IDR", providerPaymentId: null, order: { id: "order-1", total: 184_500, currency: "IDR", paymentStatus: "PENDING", status: "AWAITING_PAYMENT" } }, otherAttempts: [], events: [] };
}

describe("DOKU notification transaction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("atomically marks the attempt and awaiting order paid and records one event", async () => {
    const state = pendingState();
    configureNotification(state);
    await expect(applyDokuNotification(notification)).resolves.toBe("acknowledged");
    expect(state.attempt).toMatchObject({ status: "PAID", providerPaymentId: "doku-payment" });
    expect(state.attempt?.order).toMatchObject({ paymentStatus: "PAID", status: "PAID" });
    expect(state.events).toHaveLength(1);
  });

  it("is idempotent for duplicate success notifications", async () => {
    const state = pendingState();
    configureNotification(state);
    await applyDokuNotification(notification);
    await applyDokuNotification(notification);
    expect(state.attempt?.status).toBe("PAID");
    expect(state.events).toHaveLength(1);
  });

  it("does not mutate an unknown, mismatched, or stale payment into paid", async () => {
    const state = pendingState();
    configureNotification(state);
    await expect(applyDokuNotification({ ...notification, amount: 1 })).resolves.toBe("mismatch");
    expect(state.attempt?.status).toBe("PENDING");
    await expect(applyDokuNotification({ ...notification, currency: "USD" })).resolves.toBe("mismatch");
    expect(state.attempt?.status).toBe("PENDING");
    expect(state.attempt?.order.paymentStatus).toBe("PENDING");

    expect(state.attempt?.order.paymentStatus).toBe("PENDING");
    expect(state.events).toHaveLength(0);

    state.attempt = null;
    await expect(applyDokuNotification(notification)).resolves.toBe("unknown");
  });

  it("does not let a stale attempt regress an order paid by a newer attempt", async () => {
    const state = pendingState();
    state.otherAttempts = [{ id: "attempt-old", status: "EXPIRED" }];
    configureNotification(state);
    await applyDokuNotification(notification);
    expect(state.otherAttempts[0]?.status).toBe("EXPIRED");
    const stale = state.attempt!;
    state.attempt = { ...stale, id: "attempt-old", status: "EXPIRED", order: stale.order };
    await applyDokuNotification({ ...notification, invoiceNumber: "PAY-STALE" });
    expect(stale.order.paymentStatus).toBe("PAID");
    expect(state.events).toHaveLength(1);
  });
});
