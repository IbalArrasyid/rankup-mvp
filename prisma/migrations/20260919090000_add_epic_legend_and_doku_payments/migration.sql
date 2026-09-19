-- Adds append-only payment attempt history for DOKU QRIS Checkout.
CREATE TYPE "PaymentProvider" AS ENUM ('DOKU');
CREATE TYPE "PaymentMethod" AS ENUM ('QRIS');
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED');

ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'PAYMENT_MARKED_PAID_MANUALLY';

CREATE TABLE "PaymentAttempt" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'PENDING',
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "providerInvoiceNumber" TEXT NOT NULL,
  "providerPaymentId" TEXT,
  "providerRequestId" TEXT,
  "checkoutUrl" TEXT,
  "expiresAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentAttempt_publicId_key" ON "PaymentAttempt"("publicId");
CREATE UNIQUE INDEX "PaymentAttempt_providerInvoiceNumber_key" ON "PaymentAttempt"("providerInvoiceNumber");
CREATE INDEX "PaymentAttempt_orderId_status_idx" ON "PaymentAttempt"("orderId", "status");
CREATE INDEX "PaymentAttempt_provider_status_expiresAt_idx" ON "PaymentAttempt"("provider", "status", "expiresAt");
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
