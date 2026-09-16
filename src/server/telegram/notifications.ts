import { getRankTierForStar } from "@/domain/rank";
import { sendTelegramMessage } from "@/lib/telegram/client";

type JobOffer = {
  publicId: string;
  order: {
    initialAbsoluteStar: number;
    progressAbsoluteStar: number;
    targetAbsoluteStar: number;
  };
};

type Recipient = { publicId: string; telegramUserId: string };

function rankLabel(star: number): string {
  return `${getRankTierForStar(star)?.label ?? "Rank"} ${star} ⭐`;
}

function jobOfferText(job: JobOffer): string {
  const remaining = job.order.targetAbsoluteStar - job.order.progressAbsoluteStar;
  return [
    "JOB BARU",
    "",
    `Job: ${job.publicId}`,
    `Current: ${rankLabel(job.order.progressAbsoluteStar)}`,
    `Target: ${rankLabel(job.order.targetAbsoluteStar)}`,
    `Sisa: ${remaining} ⭐`,
  ].join("\n");
}

export async function notifyTelegramJobRecipients(job: JobOffer, recipients: Recipient[]): Promise<{ sent: number; failed: number }> {
  const results = await Promise.allSettled(recipients.map((recipient) =>
    sendTelegramMessage(recipient.telegramUserId, jobOfferText(job), [[{ text: "Ambil Job", callback_data: `claim:${job.publicId}` }]]),
  ));
  let sent = 0;
  let failed = 0;
  results.forEach((result, index) => {
    if (result.status === "fulfilled") sent += 1;
    else {
      failed += 1;
      console.error(`Telegram job offer delivery failed for job ${job.publicId} and joki ${recipients[index].publicId}.`);
    }
  });
  return { sent, failed };
}
