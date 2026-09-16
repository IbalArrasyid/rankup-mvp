import { publicJobIdPattern } from "@/domain/job-id";
import { getRankTierForStar } from "@/domain/rank";
import { answerTelegramCallback, sendTelegramMessage } from "@/lib/telegram/client";
import { claimJobFromTelegram, getOpenJobsForTelegramJoki, startTelegramJob } from "@/server/jobs/job-pool";
import { getJokiByTelegramUserId, linkJokiTelegramAccount, TelegramIdentityError } from "@/server/telegram/identity";

type TelegramUser = { id: number | string; username?: string };
type TelegramMessage = { text?: string; chat: { id: number | string }; from?: TelegramUser };
type TelegramCallback = { id: string; data?: string; from: TelegramUser; message?: { chat: { id: number | string } } };
export type TelegramUpdate = { message?: TelegramMessage; callback_query?: TelegramCallback };

function rankLabel(star: number): string {
  return `${getRankTierForStar(star)?.label ?? "Rank"} ${star} ⭐`;
}

function unlinkedText(): string {
  return "Kamu belum terhubung ke akun Joki RankUp. Minta link aktivasi dari admin.";
}

async function handleStart(message: TelegramMessage, argument: string | undefined): Promise<void> {
  const sender = message.from;
  if (!sender) return;
  const chatId = String(message.chat.id);
  if (argument?.startsWith("link_")) {
    try {
      await linkJokiTelegramAccount(argument.slice("link_".length), String(sender.id), sender.username);
      await sendTelegramMessage(chatId, "Telegram berhasil terhubung ke akun Joki RankUp.");
    } catch (error) {
      if (error instanceof TelegramIdentityError) await sendTelegramMessage(chatId, "Link tidak valid atau sudah kedaluwarsa.");
      else await sendTelegramMessage(chatId, "Link tidak valid atau sudah kedaluwarsa.");
    }
    return;
  }

  const joki = await getJokiByTelegramUserId(String(sender.id));
  if (!joki) {
    await sendTelegramMessage(chatId, unlinkedText());
    return;
  }
  const active = joki.assignments[0];
  const assignmentText = active ? `\nJob aktif: ${active.order.publicId} (${active.order.status})` : "\nTidak ada job aktif.";
  await sendTelegramMessage(chatId, `Halo ${joki.name}.\nKetersediaan: ${joki.availability}.${assignmentText}\n\nGunakan /jobs untuk melihat job dan /active untuk job aktif.`);
}

async function handleJobs(message: TelegramMessage): Promise<void> {
  const sender = message.from;
  if (!sender) return;
  const chatId = String(message.chat.id);
  const result = await getOpenJobsForTelegramJoki(String(sender.id));
  if (!result.joki) {
    await sendTelegramMessage(chatId, unlinkedText());
    return;
  }
  if (result.jobs.length === 0) {
    await sendTelegramMessage(chatId, "Tidak ada job yang tersedia untukmu saat ini.");
    return;
  }
  await Promise.all(result.jobs.map((job) => {
    const remaining = job.order.targetAbsoluteStar - job.order.progressAbsoluteStar;
    return sendTelegramMessage(chatId, [
      `Job: ${job.publicId}`,
      `Current: ${rankLabel(job.order.progressAbsoluteStar)}`,
      `Target: ${rankLabel(job.order.targetAbsoluteStar)}`,
      `Sisa: ${remaining} ⭐`,
    ].join("\n"), [[{ text: "Ambil Job", callback_data: `claim:${job.publicId}` }]]);
  }));
}

async function handleActive(message: TelegramMessage): Promise<void> {
  const sender = message.from;
  if (!sender) return;
  const chatId = String(message.chat.id);
  const joki = await getJokiByTelegramUserId(String(sender.id));
  if (!joki) {
    await sendTelegramMessage(chatId, unlinkedText());
    return;
  }
  const active = joki.assignments[0];
  if (!active) {
    await sendTelegramMessage(chatId, "Tidak ada job aktif.");
    return;
  }
  const lines = [
    `Order: ${active.order.publicId}`,
    `Current: ${rankLabel(active.order.progressAbsoluteStar)}`,
    `Target: ${rankLabel(active.order.targetAbsoluteStar)}`,
    `Progress: ${active.order.progressAbsoluteStar - active.order.initialAbsoluteStar}/${active.order.targetAbsoluteStar - active.order.initialAbsoluteStar} ⭐`,
    `Status: ${active.order.status}`,
    `Ditugaskan: ${active.assignedAt.toLocaleString("id-ID")}`,
    ...(active.startedAt ? [`Mulai: ${active.startedAt.toLocaleString("id-ID")}`] : []),
  ];
  const buttons = active.order.status === "ASSIGNED" ? [[{ text: "Mulai Job", callback_data: `start:${active.order.publicId}` }]] : undefined;
  await sendTelegramMessage(chatId, lines.join("\n"), buttons);
}

async function handleCallback(callback: TelegramCallback): Promise<void> {
  const data = callback.data ?? "";
  const telegramUserId = String(callback.from.id);
  if (data.startsWith("claim:")) {
    const jobPublicId = data.slice("claim:".length);
    if (!publicJobIdPattern.test(jobPublicId)) {
      await answerTelegramCallback(callback.id, "Job sudah diambil atau tidak lagi tersedia.");
      return;
    }
    try {
      await claimJobFromTelegram(telegramUserId, jobPublicId);
      await answerTelegramCallback(callback.id, "Job berhasil kamu ambil.");
    } catch {
      await answerTelegramCallback(callback.id, "Job sudah diambil atau tidak lagi tersedia.");
    }
    return;
  }
  if (data.startsWith("start:")) {
    const orderPublicId = data.slice("start:".length);
    try {
      const result = await startTelegramJob(telegramUserId, orderPublicId);
      await answerTelegramCallback(callback.id, result.started ? "Job dimulai." : "Job sudah dimulai.");
    } catch {
      await answerTelegramCallback(callback.id, "Job belum dapat dimulai.");
    }
  }
}

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  if (update.callback_query) {
    await handleCallback(update.callback_query);
    return;
  }
  const message = update.message;
  const text = message?.text?.trim();
  if (!message || !text?.startsWith("/")) return;
  const [commandWithBot, argument] = text.split(/\s+/, 2);
  const command = commandWithBot.split("@")[0].toLowerCase();
  if (command === "/start") await handleStart(message, argument);
  if (command === "/jobs") await handleJobs(message);
  if (command === "/active") await handleActive(message);
}
