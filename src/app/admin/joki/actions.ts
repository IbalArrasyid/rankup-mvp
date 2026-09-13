"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { toAbsoluteStar } from "@/domain/rank";
import { parseNormalizedWhatsapp } from "@/validation/orders";
import { jokiProfileSchema, type JokiProfileInput } from "@/validation/joki";
import { createAdminJoki, updateAdminJoki } from "@/server/admin/joki";
import { requireAdminSession } from "@/server/admin/session";

function jokiRedirect(destination: string, key: "notice" | "error", value: string): never {
  redirect(`${destination}?${key}=${encodeURIComponent(value)}`);
}

function optionalText(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseJokiForm(formData: FormData): { ok: true; input: JokiProfileInput; whatsapp: string } | { ok: false; message: string } {
  const currentRank = optionalText(formData.get("currentRank"));
  const currentStarText = optionalText(formData.get("currentStar"));
  const parsed = jokiProfileSchema.safeParse({
    name: formData.get("name"),
    whatsapp: formData.get("whatsapp"),
    telegramUsername: optionalText(formData.get("telegramUsername")),
    peakRank: formData.get("peakRank"),
    peakStar: Number(formData.get("peakStar")),
    currentRank,
    currentStar: currentStarText === undefined ? undefined : Number(currentStarText),
    roles: formData.getAll("roles"),
    heroPool: (typeof formData.get("heroPool") === "string" ? String(formData.get("heroPool")) : "").split(/[\n,]/),
    status: formData.get("status"),
    availability: formData.get("availability"),
    notes: optionalText(formData.get("notes")),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Data joki belum valid." };

  try {
    const input = {
      ...parsed.data,
      peakStar: toAbsoluteStar(parsed.data.peakRank, parsed.data.peakStar),
      currentStar: parsed.data.currentRank && parsed.data.currentStar !== undefined
        ? toAbsoluteStar(parsed.data.currentRank, parsed.data.currentStar)
        : undefined,
    };
    return { ok: true, input, whatsapp: parseNormalizedWhatsapp(parsed.data.whatsapp) };
  } catch {
    return { ok: false, message: "Rank atau WhatsApp joki tidak valid." };
  }
}

function logJokiActionFailure(action: string): void {
  console.error(`Admin joki ${action} action failed.`);
}

export async function createJokiAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const parsed = parseJokiForm(formData);
  if (!parsed.ok) jokiRedirect("/admin/joki/new", "error", parsed.message);

  let publicId: string | null = null;
  let errorMessage: string | null = null;
  try {
    const joki = await createAdminJoki(parsed.input, parsed.whatsapp);
    publicId = joki.publicId;
    revalidatePath("/admin/joki");
    revalidatePath("/admin");
  } catch {
    logJokiActionFailure("creation");
    errorMessage = "Joki belum dapat dibuat.";
  }
  if (errorMessage) jokiRedirect("/admin/joki/new", "error", errorMessage);
  redirect(`/admin/joki/${publicId}?notice=${encodeURIComponent("Joki berhasil dibuat.")}`);
}

export async function updateJokiAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const publicId = formData.get("publicId");
  if (typeof publicId !== "string" || !publicId) jokiRedirect("/admin/joki", "error", "Joki tidak valid.");
  const parsed = parseJokiForm(formData);
  if (!parsed.ok) jokiRedirect(`/admin/joki/${encodeURIComponent(publicId)}`, "error", parsed.message);

  let errorMessage: string | null = null;
  try {
    await updateAdminJoki(publicId, parsed.input, parsed.whatsapp);
    revalidatePath("/admin/joki");
    revalidatePath(`/admin/joki/${publicId}`);
    revalidatePath("/admin");
  } catch {
    logJokiActionFailure("update");
    errorMessage = "Data joki belum dapat diperbarui.";
  }
  if (errorMessage) jokiRedirect(`/admin/joki/${encodeURIComponent(publicId)}`, "error", errorMessage);
  jokiRedirect(`/admin/joki/${encodeURIComponent(publicId)}`, "notice", "Data joki diperbarui.");
}
