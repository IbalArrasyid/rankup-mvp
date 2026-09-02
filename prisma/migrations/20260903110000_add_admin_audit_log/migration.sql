-- CreateEnum
CREATE TYPE "AdminAuditAction" AS ENUM ('ADMIN_LOGIN_SUCCESS', 'ADMIN_LOGIN_FAILED', 'PAYMENT_MARKED_PAID', 'ORDER_STATUS_CHANGED', 'ORDER_PROGRESS_UPDATED', 'CREDENTIAL_REVEALED');

-- AlterEnum
ALTER TYPE "OrderEventType" ADD VALUE 'PROGRESS_UPDATED';

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "action" "AdminAuditAction" NOT NULL,
    "orderId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAuditLog_orderId_createdAt_idx" ON "AdminAuditLog"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_createdAt_idx" ON "AdminAuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
