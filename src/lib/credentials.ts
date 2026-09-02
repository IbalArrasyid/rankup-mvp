import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  type CipherGCM,
  type DecipherGCM,
} from "node:crypto";

export type EncryptedValue = {
  ciphertext: string;
  iv: string;
  authTag: string;
};

export class CredentialEncryptionError extends Error {}

function getKey(keyValue = process.env.CREDENTIAL_ENCRYPTION_KEY): Buffer {
  if (!keyValue) {
    throw new CredentialEncryptionError("Konfigurasi enkripsi kredensial belum tersedia.");
  }

  const key = Buffer.from(keyValue, "base64");
  if (key.length !== 32) {
    throw new CredentialEncryptionError("Konfigurasi enkripsi kredensial tidak valid.");
  }

  return key;
}

export function encryptCredentialValue(plaintext: string, keyValue?: string): EncryptedValue {
  if (!plaintext) {
    throw new CredentialEncryptionError("Data kredensial tidak boleh kosong.");
  }

  const iv = randomBytes(12);
  const cipher: CipherGCM = createCipheriv("aes-256-gcm", getKey(keyValue), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptCredentialValue(encrypted: EncryptedValue, keyValue?: string): string {
  try {
    const decipher: DecipherGCM = createDecipheriv(
      "aes-256-gcm",
      getKey(keyValue),
      Buffer.from(encrypted.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  } catch (error) {
    if (error instanceof CredentialEncryptionError) throw error;
    throw new CredentialEncryptionError("Kredensial tidak dapat diverifikasi.");
  }
}
