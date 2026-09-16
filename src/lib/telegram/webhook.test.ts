import { describe, expect, it } from "vitest";
import { hasValidTelegramWebhookSecret } from "@/lib/telegram/webhook";

describe("Telegram webhook secret", () => {
  it("rejects a missing or invalid secret", () => {
    const previous = process.env.TELEGRAM_WEBHOOK_SECRET;
    try {
      process.env.TELEGRAM_WEBHOOK_SECRET = "test-secret";
      expect(hasValidTelegramWebhookSecret(null)).toBe(false);
      expect(hasValidTelegramWebhookSecret("wrong-secret")).toBe(false);
      expect(hasValidTelegramWebhookSecret("test-secret")).toBe(true);
    } finally {
      if (previous === undefined) delete process.env.TELEGRAM_WEBHOOK_SECRET;
      else process.env.TELEGRAM_WEBHOOK_SECRET = previous;
    }
  });
});
