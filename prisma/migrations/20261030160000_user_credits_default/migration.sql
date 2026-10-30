-- Signup grant now comes from FREE_PLAN.credits (src/config/plans.ts).
-- Changes only the column default; existing balances are untouched.
ALTER TABLE "public"."User" ALTER COLUMN "credits" SET DEFAULT 3;
