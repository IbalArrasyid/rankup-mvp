-- CreateEnum
CREATE TYPE "ServiceMode" AS ENUM ('ACCOUNT', 'GENDONG');

-- AlterTable
-- Add nullable columns first so this migration remains safe for non-empty databases.
ALTER TABLE "Order"
ADD COLUMN "serviceMode" "ServiceMode",
ADD COLUMN "mlbbNickname" TEXT,
ADD COLUMN "mlbbUserId" TEXT,
ADD COLUMN "mlbbServerId" TEXT;

-- Historical orders were all account-login orders.
UPDATE "Order"
SET "serviceMode" = 'ACCOUNT'
WHERE "serviceMode" IS NULL;

ALTER TABLE "Order"
ALTER COLUMN "serviceMode" SET NOT NULL;

-- Existing workers historically supported account-login orders.
ALTER TABLE "Joki"
ADD COLUMN "serviceModes" "ServiceMode"[];

UPDATE "Joki"
SET "serviceModes" = ARRAY['ACCOUNT'::"ServiceMode"]
WHERE "serviceModes" IS NULL;

ALTER TABLE "Joki"
ALTER COLUMN "serviceModes" SET NOT NULL;

-- A Gendong order must carry the minimum in-game identity needed for coordination.
ALTER TABLE "Order"
ADD CONSTRAINT "Order_gendong_identity_required"
CHECK (
  "serviceMode" <> 'GENDONG'
  OR (
    NULLIF(BTRIM("mlbbNickname"), '') IS NOT NULL
    AND NULLIF(BTRIM("mlbbUserId"), '') IS NOT NULL
    AND NULLIF(BTRIM("mlbbServerId"), '') IS NOT NULL
  )
);

-- Every Joki must support at least one fulfillment mode.
ALTER TABLE "Joki"
ADD CONSTRAINT "Joki_serviceModes_nonempty"
CHECK (cardinality("serviceModes") > 0);

-- CreateIndex
CREATE INDEX "Order_serviceMode_idx" ON "Order"("serviceMode");
CREATE INDEX "Joki_serviceModes_idx" ON "Joki" USING GIN ("serviceModes");
