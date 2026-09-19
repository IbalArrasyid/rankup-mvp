import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function dokuDigest(rawBody: string): string {
  return createHash("sha256").update(rawBody, "utf8").digest("base64");
}

export function dokuSignature(input: { clientId: string; requestId: string; timestamp: string; requestTarget: string; rawBody: string; secretKey: string }): string {
  const component = [
    `Client-Id:${input.clientId}`,
    `Request-Id:${input.requestId}`,
    `Request-Timestamp:${input.timestamp}`,
    `Request-Target:${input.requestTarget}`,
    `Digest:${dokuDigest(input.rawBody)}`,
  ].join("\n");
  return `HMACSHA256=${createHmac("sha256", input.secretKey).update(component, "utf8").digest("base64")}`;
}

export function verifyDokuSignature(input: Parameters<typeof dokuSignature>[0] & { signature: string | null }): boolean {
  if (!input.signature) return false;
  const expected = dokuSignature(input);
  const actualBuffer = Buffer.from(input.signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
