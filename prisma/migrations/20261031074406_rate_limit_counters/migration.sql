-- CreateTable
CREATE TABLE "public"."RateLimitCounter" (
    "key" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitCounter_pkey" PRIMARY KEY ("key","window_start")
);

-- CreateIndex
CREATE INDEX "RateLimitCounter_expires_at_idx" ON "public"."RateLimitCounter"("expires_at");
