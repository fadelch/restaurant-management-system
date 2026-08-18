-- AlterTable
ALTER TABLE "public"."Food" ADD COLUMN "minStock" INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "public"."Order"
ADD COLUMN "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "deliveryZoneId" TEXT,
ADD COLUMN "couponId" TEXT,
ADD COLUMN "couponCode" TEXT;

UPDATE "public"."Order" SET "subtotal" = "total" WHERE "subtotal" = 0;

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT,
    "adminEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."DeliveryZone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deliveryFee" DOUBLE PRECISION NOT NULL,
    "minimumOrder" DOUBLE PRECISION NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."RestaurantHours" (
    "id" SERIAL NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "openTime" TEXT NOT NULL,
    "closeTime" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RestaurantHours_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "minimumOrder" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT,
    "categoryId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."StockMovement" (
    "id" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "adminId" TEXT,
    "orderId" TEXT,
    "change" INTEGER NOT NULL,
    "previousQty" INTEGER NOT NULL,
    "newQty" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- Seed default opening hours: Sunday through Saturday, 09:00 to 23:00.
INSERT INTO "public"."RestaurantHours" ("dayOfWeek", "openTime", "closeTime", "isClosed", "updatedAt")
VALUES
  (0, '09:00', '23:00', false, CURRENT_TIMESTAMP),
  (1, '09:00', '23:00', false, CURRENT_TIMESTAMP),
  (2, '09:00', '23:00', false, CURRENT_TIMESTAMP),
  (3, '09:00', '23:00', false, CURRENT_TIMESTAMP),
  (4, '09:00', '23:00', false, CURRENT_TIMESTAMP),
  (5, '09:00', '23:00', false, CURRENT_TIMESTAMP),
  (6, '09:00', '23:00', false, CURRENT_TIMESTAMP);

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "public"."AuditLog"("createdAt");
CREATE INDEX "AuditLog_adminId_idx" ON "public"."AuditLog"("adminId");
CREATE INDEX "AuditLog_entityType_idx" ON "public"."AuditLog"("entityType");
CREATE UNIQUE INDEX "DeliveryZone_name_key" ON "public"."DeliveryZone"("name");
CREATE UNIQUE INDEX "RestaurantHours_dayOfWeek_key" ON "public"."RestaurantHours"("dayOfWeek");
CREATE UNIQUE INDEX "Coupon_code_key" ON "public"."Coupon"("code");
CREATE INDEX "Coupon_userId_idx" ON "public"."Coupon"("userId");
CREATE INDEX "Coupon_categoryId_idx" ON "public"."Coupon"("categoryId");
CREATE INDEX "StockMovement_foodId_createdAt_idx" ON "public"."StockMovement"("foodId", "createdAt");
CREATE INDEX "StockMovement_adminId_idx" ON "public"."StockMovement"("adminId");
CREATE INDEX "StockMovement_orderId_idx" ON "public"."StockMovement"("orderId");

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_deliveryZoneId_fkey" FOREIGN KEY ("deliveryZoneId") REFERENCES "public"."DeliveryZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "public"."Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."Coupon" ADD CONSTRAINT "Coupon_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Coupon" ADD CONSTRAINT "Coupon_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."FoodType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."StockMovement" ADD CONSTRAINT "StockMovement_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "public"."Food"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."StockMovement" ADD CONSTRAINT "StockMovement_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."StockMovement" ADD CONSTRAINT "StockMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
