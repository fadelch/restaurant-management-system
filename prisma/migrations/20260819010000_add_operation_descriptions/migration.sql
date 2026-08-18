ALTER TABLE "public"."DeliveryZone"
ADD COLUMN "description" TEXT NOT NULL DEFAULT '';

ALTER TABLE "public"."Coupon"
ADD COLUMN "description" TEXT NOT NULL DEFAULT '';
