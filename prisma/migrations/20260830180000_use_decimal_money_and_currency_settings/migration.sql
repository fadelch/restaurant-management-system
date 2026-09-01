-- Abort rather than silently rounding any existing financial value.
DO $money_preflight$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "public"."Food"
    WHERE "price"::numeric <> ROUND("price"::numeric, 2)
       OR "extraCheesePrice"::numeric <> ROUND("extraCheesePrice"::numeric, 2)
  ) OR EXISTS (
    SELECT 1 FROM "public"."Order"
    WHERE "total"::numeric <> ROUND("total"::numeric, 2)
       OR "subtotal"::numeric <> ROUND("subtotal"::numeric, 2)
       OR "deliveryFee"::numeric <> ROUND("deliveryFee"::numeric, 2)
       OR "discountAmount"::numeric <> ROUND("discountAmount"::numeric, 2)
       OR "refundedAmount"::numeric <> ROUND("refundedAmount"::numeric, 2)
  ) OR EXISTS (
    SELECT 1 FROM "public"."OrderItem"
    WHERE "price"::numeric <> ROUND("price"::numeric, 2)
  ) OR EXISTS (
    SELECT 1 FROM "public"."FoodIssueReport"
    WHERE "refundAmount"::numeric <> ROUND("refundAmount"::numeric, 2)
  ) OR EXISTS (
    SELECT 1 FROM "public"."DeliveryZone"
    WHERE "deliveryFee"::numeric <> ROUND("deliveryFee"::numeric, 2)
       OR "minimumOrder"::numeric <> ROUND("minimumOrder"::numeric, 2)
  ) OR EXISTS (
    SELECT 1 FROM "public"."Coupon"
    WHERE "minimumOrder"::numeric <> ROUND("minimumOrder"::numeric, 2)
       OR "value"::numeric <> ROUND("value"::numeric, 4)
  ) OR EXISTS (
    SELECT 1
    FROM "public"."Food",
         jsonb_array_elements("optionalIngredients") AS ingredient
    WHERE jsonb_typeof(ingredient->'price') <> 'number'
       OR (ingredient->>'price')::numeric <> ROUND((ingredient->>'price')::numeric, 2)
  ) THEN
    RAISE EXCEPTION 'Money migration aborted: an existing value exceeds its target precision.';
  END IF;
END
$money_preflight$;

ALTER TABLE "public"."Food"
  ALTER COLUMN "price" TYPE NUMERIC(14,2) USING "price"::numeric(14,2),
  ALTER COLUMN "extraCheesePrice" TYPE NUMERIC(14,2) USING "extraCheesePrice"::numeric(14,2);

ALTER TABLE "public"."Order"
  ALTER COLUMN "total" TYPE NUMERIC(14,2) USING "total"::numeric(14,2),
  ALTER COLUMN "subtotal" TYPE NUMERIC(14,2) USING "subtotal"::numeric(14,2),
  ALTER COLUMN "deliveryFee" TYPE NUMERIC(14,2) USING "deliveryFee"::numeric(14,2),
  ALTER COLUMN "discountAmount" TYPE NUMERIC(14,2) USING "discountAmount"::numeric(14,2),
  ALTER COLUMN "refundedAmount" TYPE NUMERIC(14,2) USING "refundedAmount"::numeric(14,2),
  ADD COLUMN "exchangeRateUsed" NUMERIC(18,4);

ALTER TABLE "public"."OrderItem"
  ALTER COLUMN "price" TYPE NUMERIC(14,2) USING "price"::numeric(14,2);

ALTER TABLE "public"."FoodIssueReport"
  ALTER COLUMN "refundAmount" TYPE NUMERIC(14,2) USING "refundAmount"::numeric(14,2);

ALTER TABLE "public"."DeliveryZone"
  ALTER COLUMN "deliveryFee" TYPE NUMERIC(14,2) USING "deliveryFee"::numeric(14,2),
  ALTER COLUMN "minimumOrder" TYPE NUMERIC(14,2) USING "minimumOrder"::numeric(14,2);

ALTER TABLE "public"."Coupon"
  ALTER COLUMN "value" TYPE NUMERIC(14,4) USING "value"::numeric(14,4),
  ALTER COLUMN "minimumOrder" TYPE NUMERIC(14,2) USING "minimumOrder"::numeric(14,2);

CREATE TABLE "public"."RestaurantSettings" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "usdToLbpRate" NUMERIC(18,4),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "updatedById" TEXT,
  CONSTRAINT "RestaurantSettings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RestaurantSettings_updatedById_idx"
ON "public"."RestaurantSettings"("updatedById");

ALTER TABLE "public"."RestaurantSettings"
ADD CONSTRAINT "RestaurantSettings_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
