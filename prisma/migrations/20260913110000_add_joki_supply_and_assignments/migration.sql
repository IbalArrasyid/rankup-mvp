-- CreateEnum
CREATE TYPE "JokiStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "JokiAvailability" AS ENUM ('AVAILABLE', 'BUSY', 'OFFLINE');

-- CreateEnum
CREATE TYPE "JokiRole" AS ENUM ('JUNGLE', 'MID', 'GOLD', 'EXP', 'ROAM');

-- CreateEnum
CREATE TYPE "OrderAssignmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "AdminAuditAction" ADD VALUE 'JOKI_CREATED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'JOKI_UPDATED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'JOKI_ASSIGNED';
ALTER TYPE "AdminAuditAction" ADD VALUE 'JOKI_UNASSIGNED';

-- CreateTable
CREATE TABLE "Joki" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "telegramUsername" TEXT,
    "peakAbsoluteStar" INTEGER NOT NULL,
    "currentAbsoluteStar" INTEGER,
    "roles" "JokiRole"[] NOT NULL,
    "heroPool" TEXT[] NOT NULL,
    "status" "JokiStatus" NOT NULL DEFAULT 'ACTIVE',
    "availability" "JokiAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Joki_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderAssignment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "jokiId" TEXT NOT NULL,
    "status" "OrderAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Joki_publicId_key" ON "Joki"("publicId");
CREATE INDEX "Joki_whatsapp_idx" ON "Joki"("whatsapp");
CREATE INDEX "Joki_status_availability_idx" ON "Joki"("status", "availability");
CREATE INDEX "Joki_createdAt_idx" ON "Joki"("createdAt");
CREATE INDEX "OrderAssignment_orderId_status_idx" ON "OrderAssignment"("orderId", "status");
CREATE INDEX "OrderAssignment_jokiId_status_idx" ON "OrderAssignment"("jokiId", "status");
CREATE INDEX "OrderAssignment_assignedAt_idx" ON "OrderAssignment"("assignedAt");

-- Enforce one active assignment per order and one active job per joki.
CREATE UNIQUE INDEX "OrderAssignment_one_active_order" ON "OrderAssignment"("orderId") WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX "OrderAssignment_one_active_joki" ON "OrderAssignment"("jokiId") WHERE "status" = 'ACTIVE';

-- AddForeignKey
ALTER TABLE "OrderAssignment" ADD CONSTRAINT "OrderAssignment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderAssignment" ADD CONSTRAINT "OrderAssignment_jokiId_fkey" FOREIGN KEY ("jokiId") REFERENCES "Joki"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
