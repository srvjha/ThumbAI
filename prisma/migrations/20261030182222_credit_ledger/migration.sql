-- CreateEnum
CREATE TYPE "public"."CREDIT_TX_TYPE" AS ENUM ('OPENING_BALANCE', 'SIGNUP_GRANT', 'PURCHASE', 'GENERATION_CHARGE', 'GENERATION_REFUND', 'ORDER_REFUND_CLAWBACK', 'ADMIN_ADJUSTMENT');

-- AlterTable
ALTER TABLE "public"."Thumbnail" ALTER COLUMN "request_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "credits" SET DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."CreditTransaction" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "public"."CREDIT_TX_TYPE" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "order_id" TEXT,
    "thumbnail_id" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreditTransaction_user_id_createdAt_idx" ON "public"."CreditTransaction"("user_id", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreditTransaction_type_order_id_key" ON "public"."CreditTransaction"("type", "order_id");

-- CreateIndex
CREATE UNIQUE INDEX "CreditTransaction_type_thumbnail_id_key" ON "public"."CreditTransaction"("type", "thumbnail_id");

-- AddForeignKey
ALTER TABLE "public"."CreditTransaction" ADD CONSTRAINT "CreditTransaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CreditTransaction" ADD CONSTRAINT "CreditTransaction_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CreditTransaction" ADD CONSTRAINT "CreditTransaction_thumbnail_id_fkey" FOREIGN KEY ("thumbnail_id") REFERENCES "public"."Thumbnail"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill ------------------------------------------------------------------
-- History before this migration was never recorded, so it is not rebuilt.
-- Each user starts with one OPENING_BALANCE equal to their current balance.
INSERT INTO "public"."CreditTransaction" ("id", "user_id", "type", "amount", "balance_after", "note")
SELECT gen_random_uuid()::text, "id", 'OPENING_BALANCE', "credits", "credits",
       'Balance when the credit ledger was introduced'
FROM "public"."User";

-- Orders already granted get a zero-amount PURCHASE marker. Their credits are
-- inside the opening balance; the marker exists so the unique (type, order_id)
-- constraint stops a late webhook redelivery from granting them again.
INSERT INTO "public"."CreditTransaction" ("id", "user_id", "type", "amount", "balance_after", "order_id", "note", "createdAt")
SELECT gen_random_uuid()::text, o."user_id", 'PURCHASE', 0, u."credits", o."id",
       'Granted before the ledger; included in the opening balance', o."updatedAt"
FROM "public"."Order" o
JOIN "public"."User" u ON u."id" = o."user_id"
WHERE o."credits_granted" = true;
