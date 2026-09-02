export class WhatsappValidationError extends Error {}

export function normalizeIndonesianWhatsapp(input: string): string {
  const compact = input.trim().replace(/[\s().-]/g, "");
  let normalized: string;

  if (compact.startsWith("+62")) normalized = compact.slice(1);
  else if (compact.startsWith("62")) normalized = compact;
  else if (compact.startsWith("0")) normalized = `62${compact.slice(1)}`;
  else if (compact.startsWith("8")) normalized = `62${compact}`;
  else throw new WhatsappValidationError("Gunakan nomor WhatsApp Indonesia yang valid.");

  if (!/^628\d{7,12}$/.test(normalized)) {
    throw new WhatsappValidationError("Gunakan nomor WhatsApp Indonesia yang valid.");
  }

  return normalized;
}
