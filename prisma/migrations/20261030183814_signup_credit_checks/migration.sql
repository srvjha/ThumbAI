-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "signup_checked_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."SignupCreditAttempt" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email_normalized" TEXT NOT NULL,
    "email_domain" TEXT NOT NULL,
    "ip_hash" TEXT,
    "granted" BOOLEAN NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignupCreditAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SignupCreditAttempt_user_id_key" ON "public"."SignupCreditAttempt"("user_id");

-- CreateIndex
CREATE INDEX "SignupCreditAttempt_email_normalized_idx" ON "public"."SignupCreditAttempt"("email_normalized");

-- CreateIndex
CREATE INDEX "SignupCreditAttempt_ip_hash_createdAt_idx" ON "public"."SignupCreditAttempt"("ip_hash", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."SignupCreditAttempt" ADD CONSTRAINT "SignupCreditAttempt_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill ------------------------------------------------------------------
-- Everyone who already exists got their signup credits under the old rules.
UPDATE "public"."User" SET "signup_checked_at" = "createdAt";

-- Record their emails as having claimed the grant, so a new account on the
-- same address is refused. Must match normalizeEmail() in
-- src/server/signupCredits.ts (a test checks the two agree).
INSERT INTO "public"."SignupCreditAttempt" ("id", "user_id", "email_normalized", "email_domain", "granted", "reason", "createdAt")
SELECT gen_random_uuid()::text, u."id",
       CASE WHEN p.domain IN ('gmail.com', 'googlemail.com')
            THEN replace(p.local, '.', '') || '@gmail.com'
            ELSE p.local || '@' || p.domain END,
       CASE WHEN p.domain = 'googlemail.com' THEN 'gmail.com' ELSE p.domain END,
       true, 'granted before signup checks', u."createdAt"
FROM "public"."User" u
CROSS JOIN LATERAL (
  SELECT regexp_replace(regexp_replace(lower(trim(u."email")), '@[^@]*$', ''), '\+.*$', '') AS local,
         regexp_replace(lower(trim(u."email")), '^.*@', '') AS domain
) p;
