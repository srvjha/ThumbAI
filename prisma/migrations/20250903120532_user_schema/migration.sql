-- CreateEnum
CREATE TYPE "public"."PLAN" AS ENUM ('FREE', 'PAID');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "clerk_id" TEXT NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 7,
    "plan" "public"."PLAN" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
