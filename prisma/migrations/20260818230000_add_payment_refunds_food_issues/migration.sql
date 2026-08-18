-- Track cash-on-delivery payment state independently from order preparation.
ALTER TABLE "public"."Order"
ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN "refundedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Backfill completed and cancelled historical orders with a sensible state.
UPDATE "public"."Order"
SET "paymentStatus" = CASE
  WHEN LOWER("status") IN ('done', 'completed') THEN 'done'
  WHEN LOWER("status") IN ('cancelled', 'canceled') THEN 'cancelled'
  ELSE 'pending'
END;

-- Customer reports for damaged, spoiled, incorrect, or contaminated food.
CREATE TABLE "public"."FoodIssueReport" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "refundAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    CONSTRAINT "FoodIssueReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FoodIssueReport_status_createdAt_idx" ON "public"."FoodIssueReport"("status", "createdAt");
CREATE INDEX "FoodIssueReport_orderId_idx" ON "public"."FoodIssueReport"("orderId");
CREATE INDEX "FoodIssueReport_orderItemId_idx" ON "public"."FoodIssueReport"("orderItemId");
CREATE INDEX "FoodIssueReport_userId_idx" ON "public"."FoodIssueReport"("userId");
CREATE INDEX "Order_paymentStatus_idx" ON "public"."Order"("paymentStatus");

ALTER TABLE "public"."FoodIssueReport" ADD CONSTRAINT "FoodIssueReport_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."FoodIssueReport" ADD CONSTRAINT "FoodIssueReport_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "public"."OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."FoodIssueReport" ADD CONSTRAINT "FoodIssueReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
