import "dotenv/config";

const command = process.argv[2];
const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
const appUrl = process.env.APP_URL?.trim().replace(/\/$/, "");

async function request(method: string, payload?: Record<string, unknown>) {
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN belum dikonfigurasi.");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
  const body = await response.json() as { ok?: boolean };
  if (!response.ok || !body.ok) throw new Error("Telegram menolak permintaan webhook.");
}

async function main() {
  if (command === "set") {
    if (!appUrl || !secret) throw new Error("APP_URL dan TELEGRAM_WEBHOOK_SECRET wajib diisi.");
    await request("setWebhook", { url: `${appUrl}/api/telegram/webhook`, secret_token: secret });
    process.stdout.write("Telegram webhook berhasil dikonfigurasi.\n");
    return;
  }
  if (command === "info") {
    await request("getWebhookInfo");
    process.stdout.write("Telegram webhook dapat dihubungi.\n");
    return;
  }
  if (command === "delete") {
    await request("deleteWebhook", { drop_pending_updates: false });
    process.stdout.write("Telegram webhook berhasil dihapus.\n");
    return;
  }
  throw new Error("Gunakan set, info, atau delete.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Operasi Telegram gagal.";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
