import { Prisma } from "@/generated/prisma/client";
import { generateTelegramLinkToken, hashTelegramLinkToken, isTelegramUserId, isValidTelegramLinkToken } from "@/domain/telegram-link";
import { getPrisma } from "@/lib/prisma";

const linkTokenLifetimeMs = 15 * 60 * 1_000;

export class TelegramIdentityError extends Error {}

function invalidLink(): never {
  throw new TelegramIdentityError("Link tidak valid atau sudah kedaluwarsa.");
}

function displayUsername(username: string | undefined): string | null {
  const normalized = username?.trim().replace(/^@/, "");
  return normalized && /^[A-Za-z0-9_]{5,64}$/.test(normalized) ? normalized : null;
}

export async function createJokiTelegramLinkToken(jokiPublicId: string): Promise<{ rawToken: string; expiresAt: Date }> {
  const prisma = getPrisma();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + linkTokenLifetimeMs);
  const { rawToken, tokenHash } = generateTelegramLinkToken();

  try {
    return await prisma.$transaction(async (tx) => {
      const joki = await tx.joki.findUnique({ where: { publicId: jokiPublicId }, select: { id: true } });
      if (!joki) throw new TelegramIdentityError("Joki tidak ditemukan.");

      await tx.jokiTelegramLinkToken.updateMany({
        where: { jokiId: joki.id, usedAt: null },
        data: { usedAt: now },
      });
      await tx.jokiTelegramLinkToken.create({ data: { jokiId: joki.id, tokenHash, expiresAt } });
      return { rawToken, expiresAt };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new TelegramIdentityError("Link Telegram belum dapat dibuat. Coba lagi.");
    }
    throw error;
  }
}

export async function linkJokiTelegramAccount(rawToken: string, telegramUserId: string, username?: string): Promise<void> {
  if (!isTelegramUserId(telegramUserId)) invalidLink();

  const prisma = getPrisma();
  const now = new Date();
  const tokenHash = hashTelegramLinkToken(rawToken);
  try {
    await prisma.$transaction(async (tx) => {
      const token = await tx.jokiTelegramLinkToken.findUnique({
        where: { tokenHash },
        select: { id: true, jokiId: true, tokenHash: true, expiresAt: true, usedAt: true },
      });
      if (!token) invalidLink();
      if (!isValidTelegramLinkToken(token, rawToken, now)) invalidLink();

      const existing = await tx.joki.findUnique({ where: { telegramUserId }, select: { id: true } });
      if (existing && existing.id !== token.jokiId) invalidLink();

      const used = await tx.jokiTelegramLinkToken.updateMany({
        where: { id: token.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (used.count !== 1) invalidLink();

      await tx.joki.update({
        where: { id: token.jokiId },
        data: {
          telegramUserId,
          telegramLinkedAt: now,
          ...(displayUsername(username) ? { telegramUsername: displayUsername(username) } : {}),
        },
      });
      await tx.jokiTelegramLinkToken.updateMany({
        where: { jokiId: token.jokiId, usedAt: null },
        data: { usedAt: now },
      });
      await tx.jokiActivityLog.create({ data: { jokiId: token.jokiId, action: "TELEGRAM_LINKED" } });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof TelegramIdentityError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") invalidLink();
    throw error;
  }
}

export async function unlinkJokiTelegramAccount(jokiPublicId: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.$transaction(async (tx) => {
    const joki = await tx.joki.findUnique({ where: { publicId: jokiPublicId }, select: { id: true } });
    if (!joki) throw new TelegramIdentityError("Joki tidak ditemukan.");

    await tx.joki.update({
      where: { id: joki.id },
      data: { telegramUserId: null, telegramLinkedAt: null },
    });
    await tx.jokiTelegramLinkToken.updateMany({ where: { jokiId: joki.id, usedAt: null }, data: { usedAt: new Date() } });
    await tx.jokiActivityLog.create({ data: { jokiId: joki.id, action: "TELEGRAM_UNLINKED_BY_ADMIN" } });
  });
}

export async function getJokiByTelegramUserId(telegramUserId: string) {
  if (!isTelegramUserId(telegramUserId)) return null;
  return getPrisma().joki.findUnique({
    where: { telegramUserId },
    select: {
      id: true,
      publicId: true,
      name: true,
      status: true,
      availability: true,
      telegramUsername: true,
      assignments: {
        where: { status: "ACTIVE" },
        take: 1,
        select: {
          assignedAt: true,
          startedAt: true,
          order: { select: { publicId: true, status: true, initialAbsoluteStar: true, progressAbsoluteStar: true, targetAbsoluteStar: true, serviceMode: true } },
        },
      },
    },
  });
}
