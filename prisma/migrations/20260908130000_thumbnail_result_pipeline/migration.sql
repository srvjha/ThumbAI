-- CreateEnum
CREATE TYPE "public"."TIER" AS ENUM ('DRAFT', 'QUALITY');

-- CreateEnum
CREATE TYPE "public"."GEN_STATUS" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- AlterTable: record which endpoint served the request
ALTER TABLE "public"."Thumbnail" ADD COLUMN     "model_endpoint" TEXT,
ADD COLUMN     "model_tier" "public"."TIER";

-- Convert status from String[] to a single enum, preserving existing rows.
-- Prisma's generated diff would DROP and re-add the column, discarding data,
-- so the conversion is written by hand.
ALTER TABLE "public"."Thumbnail"
  ADD COLUMN "status_converted" "public"."GEN_STATUS" NOT NULL DEFAULT 'PENDING';

-- Rows accumulated values by pushing, so collapse to the furthest state
-- reached. This matches how readers behaved: they tested for membership of
-- 'COMPLETED' rather than reading a position.
UPDATE "public"."Thumbnail" SET "status_converted" =
  CASE
    WHEN 'COMPLETED'   = ANY("status") THEN 'COMPLETED'::"public"."GEN_STATUS"
    WHEN 'FAILED'      = ANY("status") THEN 'FAILED'::"public"."GEN_STATUS"
    WHEN 'IN_PROGRESS' = ANY("status") THEN 'IN_PROGRESS'::"public"."GEN_STATUS"
    ELSE 'PENDING'::"public"."GEN_STATUS"
  END;

ALTER TABLE "public"."Thumbnail" DROP COLUMN "status";
ALTER TABLE "public"."Thumbnail" RENAME COLUMN "status_converted" TO "status";
