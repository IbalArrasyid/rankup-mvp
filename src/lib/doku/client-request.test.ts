import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ signature: vi.fn((input: unknown) => { void input; return "HMACSHA256=test-signature"; }) }));
vi.mock("@/lib/doku/signature", () => ({ dokuSignature: mocks.signature }));

import { DOKU_CHECKOUT_REQUEST_TARGET, createDokuQrisCheckout } from "@/lib/doku/client";

const originalEnvironment = { ...process.env };
const checkoutInput = { invoiceNumber: "PAY-260919-ABCD", amount: 184_500, customerName: "Raka", customerEmail: null, customerPhone: "6281234567890", returnUrl: null, notificationUrl: null };

describe("DOKU Checkout request boundary", () => {
  beforeEach(() => {
    process.env.DOKU_ENV = "sandbox";
    process.env.DOKU_CLIENT_ID = "MCH-TEST";
    process.env.DOKU_SECRET_KEY = "test-secret";
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    process.env = { ...originalEnvironment };
  });

  it("uses the documented sandbox endpoint, exact request target, and same serialized body for signing and fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ response: { payment: { url: "https://checkout.example.test/qris" } } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await createDokuQrisCheckout(checkoutInput);

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    const signed = mocks.signature.mock.calls[0]?.[0] as unknown as { rawBody: string; requestTarget: string };
    const payload = JSON.parse(String(request.body)) as { order: { amount: number; invoice_number: string; callback_url_result?: string }; payment: { payment_method_types: string[] }; additional_info?: unknown };
    expect(url).toBe("https://api-sandbox.doku.com/checkout/v1/payment");
    expect(DOKU_CHECKOUT_REQUEST_TARGET).toBe("/checkout/v1/payment");
    expect(signed.requestTarget).toBe(DOKU_CHECKOUT_REQUEST_TARGET);
    expect(signed.rawBody).toBe(request.body);
    expect(payload.order).toMatchObject({ amount: 184_500, invoice_number: "PAY-260919-ABCD" });
    expect(payload.order.callback_url_result).toBeUndefined();
    expect(payload.additional_info).toBeUndefined();
    expect(payload.payment.payment_method_types).toEqual(["QRIS"]);
    expect(request.headers).toMatchObject({ "Content-Type": "application/json", "Client-Id": "MCH-TEST", "Signature": "HMACSHA256=test-signature" });
  });
});
