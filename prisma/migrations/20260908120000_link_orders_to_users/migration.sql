-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "credits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "credits_granted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "user_id" TEXT;

-- CreateIndex
CREATE INDEX "Order_user_id_idx" ON "public"."Order"("user_id");

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

