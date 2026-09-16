import { NextResponse } from "next/server";
import { hasValidTelegramWebhookSecret } from "@/lib/telegram/webhook";
import { handleTelegramUpdate, type TelegramUpdate } from "@/server/telegram/worker";

export async function POST(request: Request) {
  if (!hasValidTelegramWebhookSecret(request.headers.get("x-telegram-bot-api-secret-token"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  let update: TelegramUpdate;
  try {
    update = await request.json() as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }
  try {
    await handleTelegramUpdate(update);
  } catch {
    console.error("Telegram webhook handling failed.");
  }
  return NextResponse.json({ ok: true });
}
