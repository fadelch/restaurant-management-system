-- Add nullable checkout idempotency metadata so existing orders remain valid.
ALTER TABLE "public"."Order"
ADD COLUMN "checkoutRequestId" TEXT,
ADD COLUMN "checkoutRequestHash" TEXT;

-- The same textual key may be used by different customers, but a customer can
-- create only one order for a given checkout request.
CREATE UNIQUE INDEX "Order_userId_checkoutRequestId_key"
ON "public"."Order"("userId", "checkoutRequestId");

-- Database-level defense in depth for every inventory mutation.
ALTER TABLE "public"."Food"
ADD CONSTRAINT "Food_qty_nonnegative" CHECK ("qty" >= 0);
