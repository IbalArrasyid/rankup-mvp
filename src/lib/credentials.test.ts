import { describe, expect, it } from "vitest";
import { CredentialEncryptionError, decryptCredentialValue, encryptCredentialValue } from "@/lib/credentials";

const key = Buffer.alloc(32, 7).toString("base64");
const otherKey = Buffer.alloc(32, 8).toString("base64");

describe("credential encryption", () => {
  it("round-trips AES-256-GCM encrypted values", () => {
    const encrypted = encryptCredentialValue("secret-example", key);
    expect(encrypted.ciphertext).not.toContain("secret-example");
    expect(decryptCredentialValue(encrypted, key)).toBe("secret-example");
  });

  it("fails closed when the key is wrong", () => {
    expect(() => decryptCredentialValue(encryptCredentialValue("secret-example", key), otherKey)).toThrow(CredentialEncryptionError);
  });

  it("rejects a tampered ciphertext", () => {
    const encrypted = encryptCredentialValue("secret-example", key);
    expect(() => decryptCredentialValue({ ...encrypted, ciphertext: `${encrypted.ciphertext.slice(0, -2)}AA` }, key)).toThrow(CredentialEncryptionError);
  });

  it("uses a fresh IV for the same plaintext", () => {
    const first = encryptCredentialValue("secret-example", key);
    const second = encryptCredentialValue("secret-example", key);
    expect(first.iv).not.toBe(second.iv);
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });

  it("fails closed for an invalid encryption key", () => {
    expect(() => encryptCredentialValue("secret-example", "not-a-valid-32-byte-key")).toThrow(CredentialEncryptionError);
  });

  it("rejects a tampered authentication tag", () => {
    const encrypted = encryptCredentialValue("secret-example", key);
    expect(() => decryptCredentialValue({ ...encrypted, authTag: `${encrypted.authTag.slice(0, -2)}AA` }, key)).toThrow(CredentialEncryptionError);
  });
});
