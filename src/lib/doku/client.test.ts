import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DokuCheckoutError, createDokuQrisCheckout } from "@/lib/doku/client";

const originalEnvironment = { ...process.env };

describe("DOKU QRIS Checkout client", () => {
  beforeEach(() => {
    process.env.DOKU_ENV = "sandbox";
    process.env.DOKU_CLIENT_ID = "MCH-TEST";
    process.env.DOKU_SECRET_KEY = "test-secret";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...originalEnvironment };
  });

  it("sends a QRIS-only Checkout payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ response: { payment: { url: "https://checkout.example.test/qris", expired_date: "20260919120000", token_id: "doku-token" } } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await createDokuQrisCheckout({ invoiceNumber: "PAY-260919-ABCD", amount: 184_500, customerName: "Raka", customerEmail: null, customerPhone: "6281234567890", returnUrl: "https://app.example.test/order/ML-260919-ABCD/payment/return", notificationUrl: "https://app.example.test/api/payments/doku/notification" });

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const payload = JSON.parse(String(request.body)) as { order: { amount: number }; payment: { payment_method_types: string[] } };
    expect(payload.order.amount).toBe(184_500);
    expect(payload.payment.payment_method_types).toEqual(["QRIS"]);
    expect(result).toMatchObject({ checkoutUrl: "https://checkout.example.test/qris", providerPaymentId: "doku-token" });
  });
  it("converts a provider 400 into a safe diagnostic without provider response body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "QRIS is not available for this merchant" }), { status: 400 })));

    await expect(createDokuQrisCheckout({ invoiceNumber: "PAY-260919-ABCD", amount: 184_500, customerName: "Raka", customerEmail: null, customerPhone: "6281234567890", returnUrl: null, notificationUrl: null })).rejects.toMatchObject({
      diagnostic: expect.objectContaining({ httpStatus: 400, dokuMessage: "QRIS is not available for this merchant", endpointHost: "api-sandbox.doku.com", requestTarget: "/checkout/v1/payment", paymentMethodTypes: ["QRIS"] }),
    } satisfies Partial<DokuCheckoutError>);
  });

});

