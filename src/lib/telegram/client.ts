type InlineKeyboardButton = { text: string; callback_data: string };

type TelegramApiResponse<T> = { ok: boolean; result?: T };

export class TelegramApiError extends Error {}

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) throw new TelegramApiError("Telegram belum dikonfigurasi.");
  return token;
}

async function telegramRequest<T>(method: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${getBotToken()}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!response.ok) throw new TelegramApiError("Telegram API tidak dapat dihubungi.");
  const body = await response.json() as TelegramApiResponse<T>;
  if (!body.ok || body.result === undefined) throw new TelegramApiError("Telegram API menolak permintaan.");
  return body.result;
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  buttons?: InlineKeyboardButton[][],
): Promise<{ message_id: number }> {
  return telegramRequest("sendMessage", {
    chat_id: chatId,
    text,
    ...(buttons ? { reply_markup: { inline_keyboard: buttons } } : {}),
  });
}

export async function answerTelegramCallback(callbackQueryId: string, text: string): Promise<void> {
  await telegramRequest("answerCallbackQuery", { callback_query_id: callbackQueryId, text });
}
