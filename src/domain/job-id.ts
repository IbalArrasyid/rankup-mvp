import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePublicJobId(date = new Date()): string {
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const randomPart = Array.from(randomBytes(4), (byte) => ALPHABET[byte % ALPHABET.length]).join("");
  return `JOB-${year}${month}${day}-${randomPart}`;
}

export const publicJobIdPattern = /^JOB-\d{6}-[A-HJ-NP-Z2-9]{4}$/;
