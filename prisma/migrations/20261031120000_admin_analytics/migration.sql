-- CreateEnum
CREATE TYPE "public"."GEN_EVENT" AS ENUM ('CREATED', 'CHARGED', 'SUBMITTED', 'SUBMIT_FAILED', 'IN_PROGRESS', 'WEBHOOK_RECEIVED', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."FLAG_SOURCE" AS ENUM ('MODERATION', 'INJECTION');

-- CreateEnum
CREATE TYPE "public"."FLAG_SEVERITY" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "public"."ADMIN_ACTION" AS ENUM ('SUSPEND', 'UNSUSPEND', 'RESET_FLAGS', 'ADJUST_CREDITS');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "acquisition_source" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "suspended_at" TIMESTAMP(3),
ADD COLUMN     "suspended_reason" TEXT;

-- AlterTable
ALTER TABLE "public"."Thumbnail" ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "error" TEXT;

-- CreateTable
CREATE TABLE "public"."GenerationEvent" (
    "id" TEXT NOT NULL,
    "thumbnail_id" TEXT NOT NULL,
    "type" "public"."GEN_EVENT" NOT NULL,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenerationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Visitor" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "referrer_domain" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "landing_path" TEXT,
    "device" TEXT NOT NULL,
    "browser" TEXT,
    "os" TEXT,
    "pageviews" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PageView" (
    "id" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "user_id" TEXT,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PromptFlag" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "thumbnail_id" TEXT,
    "source" "public"."FLAG_SOURCE" NOT NULL,
    "categories" TEXT[],
    "score" DOUBLE PRECISION,
    "severity" "public"."FLAG_SEVERITY" NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromptFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdminAction" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "target_user_id" TEXT,
    "action" "public"."ADMIN_ACTION" NOT NULL,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GenerationEvent_thumbnail_id_createdAt_idx" ON "public"."GenerationEvent"("thumbnail_id", "createdAt");

-- CreateIndex
CREATE INDEX "Visitor_user_id_idx" ON "public"."Visitor"("user_id");

-- CreateIndex
CREATE INDEX "Visitor_first_seen_at_idx" ON "public"."Visitor"("first_seen_at");

-- CreateIndex
CREATE INDEX "PageView_createdAt_idx" ON "public"."PageView"("createdAt");

-- CreateIndex
CREATE INDEX "PromptFlag_user_id_resolved_at_idx" ON "public"."PromptFlag"("user_id", "resolved_at");

-- CreateIndex
CREATE INDEX "PromptFlag_createdAt_idx" ON "public"."PromptFlag"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAction_createdAt_idx" ON "public"."AdminAction"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAction_target_user_id_createdAt_idx" ON "public"."AdminAction"("target_user_id", "createdAt");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "public"."User"("createdAt");

-- CreateIndex
CREATE INDEX "Thumbnail_createdAt_idx" ON "public"."Thumbnail"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."GenerationEvent" ADD CONSTRAINT "GenerationEvent_thumbnail_id_fkey" FOREIGN KEY ("thumbnail_id") REFERENCES "public"."Thumbnail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Visitor" ADD CONSTRAINT "Visitor_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PageView" ADD CONSTRAINT "PageView_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "public"."Visitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PromptFlag" ADD CONSTRAINT "PromptFlag_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PromptFlag" ADD CONSTRAINT "PromptFlag_thumbnail_id_fkey" FOREIGN KEY ("thumbnail_id") REFERENCES "public"."Thumbnail"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdminAction" ADD CONSTRAINT "AdminAction_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdminAction" ADD CONSTRAINT "AdminAction_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill: rows finished before completed_at existed. updatedAt is the last
-- write, which for a completed row is the moment its images were stored.
UPDATE "public"."Thumbnail" SET "completed_at" = "updatedAt" WHERE "status" = 'COMPLETED' AND "completed_at" IS NULL;
