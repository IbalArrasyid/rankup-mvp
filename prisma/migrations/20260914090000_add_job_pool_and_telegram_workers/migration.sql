-- CreateEnum
CREATE TYPE "JobPostingStatus" AS ENUM ('OPEN', 'CLAIMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JokiActivityAction" AS ENUM ('TELEGRAM_LINKED', 'TELEGRAM_UNLINKED_BY_ADMIN', 'JOB_CLAIMED', 'JOB_STARTED');

-- AlterEnum
ALTER TYPE "AdminAuditAction" ADD VALUE 'JOB_PUBLISHED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'JOB_CANCELLED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'JOB_NOTIFICATION_RESENT';
ALTER TYPE "AdminAuditAction" ADD VALUE 'JOB_CLAIMED';

-- AlterTable
ALTER TABLE "Joki" ADD COLUMN "telegramUserId" TEXT;
ALTER TABLE "Joki" ADD COLUMN "telegramLinkedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "JokiTelegramLinkToken" (
    "id" TEXT NOT NULL,
    "jokiId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JokiTelegramLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPosting" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "JobPostingStatus" NOT NULL DEFAULT 'OPEN',
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "claimedByJokiId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobPosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JokiActivityLog" (
    "id" TEXT NOT NULL,
    "jokiId" TEXT NOT NULL,
    "orderId" TEXT,
    "jobPostingId" TEXT,
    "action" "JokiActivityAction" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JokiActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Joki_telegramUserId_key" ON "Joki"("telegramUserId");
CREATE UNIQUE INDEX "JokiTelegramLinkToken_tokenHash_key" ON "JokiTelegramLinkToken"("tokenHash");
CREATE INDEX "JokiTelegramLinkToken_jokiId_expiresAt_idx" ON "JokiTelegramLinkToken"("jokiId", "expiresAt");
CREATE UNIQUE INDEX "JobPosting_publicId_key" ON "JobPosting"("publicId");
CREATE INDEX "JobPosting_orderId_status_idx" ON "JobPosting"("orderId", "status");
CREATE INDEX "JobPosting_status_publishedAt_idx" ON "JobPosting"("status", "publishedAt");
CREATE INDEX "JobPosting_claimedByJokiId_idx" ON "JobPosting"("claimedByJokiId");
CREATE INDEX "JokiActivityLog_jokiId_createdAt_idx" ON "JokiActivityLog"("jokiId", "createdAt");
CREATE INDEX "JokiActivityLog_orderId_createdAt_idx" ON "JokiActivityLog"("orderId", "createdAt");
CREATE INDEX "JokiActivityLog_jobPostingId_createdAt_idx" ON "JokiActivityLog"("jobPostingId", "createdAt");

-- An Order can appear once in the open job pool, while preserving cancelled and claimed history.
CREATE UNIQUE INDEX "JobPosting_one_open_per_order" ON "JobPosting"("orderId") WHERE "status" = 'OPEN';

-- AddForeignKey
ALTER TABLE "JokiTelegramLinkToken" ADD CONSTRAINT "JokiTelegramLinkToken_jokiId_fkey" FOREIGN KEY ("jokiId") REFERENCES "Joki"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_claimedByJokiId_fkey" FOREIGN KEY ("claimedByJokiId") REFERENCES "Joki"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JokiActivityLog" ADD CONSTRAINT "JokiActivityLog_jokiId_fkey" FOREIGN KEY ("jokiId") REFERENCES "Joki"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JokiActivityLog" ADD CONSTRAINT "JokiActivityLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JokiActivityLog" ADD CONSTRAINT "JokiActivityLog_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
