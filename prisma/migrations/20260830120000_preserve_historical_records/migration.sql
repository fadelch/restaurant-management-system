-- Mark permanently removed accounts without deleting rows that own business history.
ALTER TABLE "public"."User"
ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "User_deletedAt_idx" ON "public"."User"("deletedAt");

-- Keep the menu name that was presented when each order item was created.
-- The default keeps the migration compatible with an older application instance
-- during deployment; all current write paths provide the actual food name.
ALTER TABLE "public"."OrderItem"
ADD COLUMN "foodName" TEXT NOT NULL DEFAULT '';

UPDATE "public"."OrderItem" AS item
SET "foodName" = food."name"
FROM "public"."Food" AS food
WHERE item."foodId" = food."id";

-- Protect orders, order items, issue reports, and inventory movements from
-- accidental cascade deletion at the database boundary.
ALTER TABLE "public"."Order" DROP CONSTRAINT "Order_userId_fkey";
ALTER TABLE "public"."OrderItem" DROP CONSTRAINT "OrderItem_orderId_fkey";
ALTER TABLE "public"."OrderItem" DROP CONSTRAINT "OrderItem_foodId_fkey";
ALTER TABLE "public"."FoodIssueReport" DROP CONSTRAINT "FoodIssueReport_orderId_fkey";
ALTER TABLE "public"."FoodIssueReport" DROP CONSTRAINT "FoodIssueReport_orderItemId_fkey";
ALTER TABLE "public"."FoodIssueReport" DROP CONSTRAINT "FoodIssueReport_userId_fkey";
ALTER TABLE "public"."Coupon" DROP CONSTRAINT "Coupon_userId_fkey";
ALTER TABLE "public"."StockMovement" DROP CONSTRAINT "StockMovement_foodId_fkey";

ALTER TABLE "public"."Order"
ADD CONSTRAINT "Order_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."OrderItem"
ADD CONSTRAINT "OrderItem_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."OrderItem"
ADD CONSTRAINT "OrderItem_foodId_fkey"
FOREIGN KEY ("foodId") REFERENCES "public"."Food"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."FoodIssueReport"
ADD CONSTRAINT "FoodIssueReport_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."FoodIssueReport"
ADD CONSTRAINT "FoodIssueReport_orderItemId_fkey"
FOREIGN KEY ("orderItemId") REFERENCES "public"."OrderItem"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."FoodIssueReport"
ADD CONSTRAINT "FoodIssueReport_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."Coupon"
ADD CONSTRAINT "Coupon_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."StockMovement"
ADD CONSTRAINT "StockMovement_foodId_fkey"
FOREIGN KEY ("foodId") REFERENCES "public"."Food"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
