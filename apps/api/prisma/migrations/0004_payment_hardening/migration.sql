-- Phase 2.4: Payment flow hardening
-- 1. Add stripeEventId (unique, nullable) for webhook idempotency
-- 2. Add refundedAmountInCents to track partial refunds
-- 3. Create Refund table

ALTER TABLE "Payment"
  ADD COLUMN "stripeEventId" TEXT,
  ADD COLUMN "refundedAmountInCents" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "Payment_stripeEventId_key" ON "Payment"("stripeEventId");

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "stripeRefundId" TEXT NOT NULL,
    "amountInCents" INTEGER NOT NULL,
    "reason" TEXT,
    "initiatedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Refund_stripeRefundId_key" ON "Refund"("stripeRefundId");
CREATE INDEX "Refund_paymentId_idx" ON "Refund"("paymentId");

ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
