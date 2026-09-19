import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dokuSignature } from "@/lib/doku/signature";

const mocks = vi.hoisted(() => ({ apply: vi.fn(), parse: vi.fn() }));
vi.mock("@/server/payments", () => ({ applyDokuNotification: mocks.apply, parseDokuNotification: mocks.parse }));

import { POST } from "@/app/api/payments/doku/notification/route";

const originalEnvironment = { ...process.env };
const rawBody = JSON.stringify({ order: { invoice_number: "PAY-260919-ABCD", amount: 184_500, currency: "IDR" }, transaction: { status: "SUCCESS", payment_id: "doku-payment" } });
const headers = { "client-id": "MCH-TEST", "request-id": "request-1", "request-timestamp": "2026-09-19T00:00:00Z" };

function webhookRequest(signature: string): Request {
  return new Request("https://app.example.test/api/payments/doku/notification", { method: "POST", headers: { ...headers, signature }, body: rawBody });
}

describe("DOKU webhook signature boundary", () => {
  beforeEach(() => {
    process.env.DOKU_ENV = "sandbox";
    process.env.DOKU_CLIENT_ID = "MCH-TEST";
    process.env.DOKU_SECRET_KEY = "test-secret";
    mocks.apply.mockResolvedValue("acknowledged");
    mocks.parse.mockReturnValue({ invoiceNumber: "PAY-260919-ABCD", amount: 184_500, currency: "IDR", transactionStatus: "SUCCESS", providerPaymentId: "doku-payment" });
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnvironment };
  });

  it("accepts a valid signed notification", async () => {
    const signature = dokuSignature({ clientId: headers["client-id"], requestId: headers["request-id"], timestamp: headers["request-timestamp"], requestTarget: "/api/payments/doku/notification", rawBody, secretKey: "test-secret" });
    await expect(POST(webhookRequest(signature))).resolves.toMatchObject({ status: 200 });
    expect(mocks.apply).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid signature before any payment mutation", async () => {
    await expect(POST(webhookRequest("HMACSHA256=invalid"))).resolves.toMatchObject({ status: 401 });
    expect(mocks.apply).not.toHaveBeenCalled();
  });
});
