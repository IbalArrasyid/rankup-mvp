import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 10;

type AdminSessionPayload = { iat: number; exp: number };

export class AdminSessionError extends Error {}

function getSessionSecret(secret = process.env.ADMIN_SESSION_SECRET): string {
  if (!secret || secret.length < 32) {
    throw new AdminSessionError("Konfigurasi sesi admin belum tersedia.");
  }

  return secret;
}

function sign(encodedPayload: string, secret?: string): string {
  return createHmac("sha256", getSessionSecret(secret)).update(encodedPayload).digest("base64url");
}

function hashCredential(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function credentialsMatch(receivedValue: string, configuredValue: string): boolean {
  const received = hashCredential(receivedValue);
  const expected = hashCredential(configuredValue);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function verifyAdminCredentials(
  username: string,
  password: string,
  configuredUsername = process.env.ADMIN_USERNAME,
  configuredPassword = process.env.ADMIN_PASSWORD,
): boolean {
  if (!configuredUsername || !configuredPassword) return false;

  const usernameMatches = credentialsMatch(username, configuredUsername);
  const passwordMatches = credentialsMatch(password, configuredPassword);
  return usernameMatches && passwordMatches;
}

export function createAdminSessionToken(now = Date.now(), secret?: string): string {
  const issuedAt = Math.floor(now / 1000);
  const payload: AdminSessionPayload = {
    iat: issuedAt,
    exp: issuedAt + ADMIN_SESSION_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

export function verifyAdminSessionToken(token: string | undefined, now = Date.now(), secret?: string): boolean {
  if (!token) return false;

  try {
    const [encoded, receivedSignature, ...extra] = token.split(".");
    if (!encoded || !receivedSignature || extra.length > 0) return false;

    const received = Buffer.from(receivedSignature);
    const expected = Buffer.from(sign(encoded, secret));
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return false;

    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as AdminSessionPayload;
    return Number.isInteger(payload.iat) && Number.isInteger(payload.exp) && payload.exp > now / 1000;
  } catch {
    return false;
  }
}

export const adminSessionCookie = {
  name: "rankup_admin_session",
  maxAge: ADMIN_SESSION_TTL_SECONDS,
} as const;
