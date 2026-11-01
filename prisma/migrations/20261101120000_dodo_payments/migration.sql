-- Payments move from Razorpay (INR) to Dodo Payments (USD). Existing rows keep
-- their ids under provider-neutral names and are tagged as Razorpay.

ALTER TABLE "Order" RENAME COLUMN "razorpayOrderId" TO "providerOrderId";
ALTER TABLE "Order" RENAME COLUMN "razorpayPaymentId" TO "providerPaymentId";
ALTER INDEX "Order_razorpayOrderId_key" RENAME TO "Order_providerOrderId_key";

-- Dodo verifies by webhook signature and an API lookup; there is no
-- per-checkout signature to keep.
ALTER TABLE "Order" DROP COLUMN "razorpaySignature";

ALTER TABLE "Order" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'razorpay';
ALTER TABLE "Order" ALTER COLUMN "provider" SET DEFAULT 'dodo';
ALTER TABLE "Order" ALTER COLUMN "currency" SET DEFAULT 'USD';
