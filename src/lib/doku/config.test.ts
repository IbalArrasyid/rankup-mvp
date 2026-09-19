import { describe, expect, it, vi } from "vitest";
import { getDokuCallbackBaseUrl, getDokuConfig } from "@/lib/doku/config";

describe("DOKU configuration", () => {
  it("uses the exact documented Sandbox base endpoint", () => {
    expect(getDokuConfig({ DOKU_ENV: "sandbox", DOKU_CLIENT_ID: "MCH-TEST", DOKU_SECRET_KEY: "test-secret" })).toMatchObject({ environment: "sandbox", baseUrl: "https://api-sandbox.doku.com" });
  });

  it("logs only safe development configuration metadata", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    getDokuConfig({ NODE_ENV: "development", DOKU_ENV: "sandbox", DOKU_CLIENT_ID: "MCH-TEST", DOKU_SECRET_KEY: "test-secret" });
    expect(info).toHaveBeenCalledWith({ dokuEnvironment: "sandbox", clientIdConfigured: true, clientIdLength: 8, secretKeyConfigured: true, secretKeyLength: 11 });
    expect(JSON.stringify(info.mock.calls)).not.toContain("test-secret");
    info.mockRestore();
  });

  it("omits callbacks when APP_URL is not public HTTPS", () => {
    expect(getDokuCallbackBaseUrl({ APP_URL: "http://localhost:3000" })).toBeNull();
    expect(getDokuCallbackBaseUrl({ APP_URL: "https://rankup.example.test/" })).toBe("https://rankup.example.test");
  });
});
