export type DokuConfig = { environment: "sandbox" | "production"; clientId: string; secretKey: string; baseUrl: string };
type DokuEnvironment = Partial<Pick<NodeJS.ProcessEnv, "NODE_ENV" | "DOKU_ENV" | "DOKU_CLIENT_ID" | "DOKU_SECRET_KEY" | "APP_URL">>;

export function getDokuConfig(env: DokuEnvironment = process.env): DokuConfig {
  const environment = env.DOKU_ENV;
  if (env.NODE_ENV === "development") {
    console.info({
      dokuEnvironment: environment === "production" ? "production" : "sandbox",
      clientIdConfigured: Boolean(env.DOKU_CLIENT_ID),
      clientIdLength: env.DOKU_CLIENT_ID?.length ?? 0,
      secretKeyConfigured: Boolean(env.DOKU_SECRET_KEY),
      secretKeyLength: env.DOKU_SECRET_KEY?.length ?? 0,
    });
  }
  if (environment !== "sandbox" && environment !== "production") throw new Error("DOKU_ENV harus sandbox atau production.");
  if (!env.DOKU_CLIENT_ID || !env.DOKU_SECRET_KEY) throw new Error("Konfigurasi DOKU belum lengkap.");
  return {
    environment,
    clientId: env.DOKU_CLIENT_ID,
    secretKey: env.DOKU_SECRET_KEY,
    baseUrl: environment === "sandbox" ? "https://api-sandbox.doku.com" : "https://api.doku.com",
  };
}

export function getDokuCallbackBaseUrl(env: DokuEnvironment = process.env): string | null {
  const url = env.APP_URL?.replace(/\/$/, "");
  return url && /^https:\/\//.test(url) ? url : null;
}
