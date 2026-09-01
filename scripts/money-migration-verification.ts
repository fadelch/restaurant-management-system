import { loadEnvConfig } from "@next/env";
import prisma from "../src/lib/prisma";

loadEnvConfig(process.cwd());

type Compatibility = {
  foodWouldRound: number;
  orderWouldRound: number;
  itemWouldRound: number;
  refundWouldRound: number;
  zoneWouldRound: number;
  couponWouldRound: number;
  optionWouldRound: number;
  foodRows: number;
  orderRows: number;
  itemRows: number;
  refundRows: number;
  coreMoneyNullRows: number;
  historicalRateNullRows: number;
  settingsRows: number;
  foodFingerprint: string;
  orderFingerprint: string;
  itemFingerprint: string;
  refundFingerprint: string;
};

async function main() {
  const [compatibility] = await prisma.$queryRaw<Compatibility[]>`
    SELECT
      (SELECT COUNT(*)::int FROM "Food" WHERE "price"::numeric <> ROUND("price"::numeric, 2) OR "extraCheesePrice"::numeric <> ROUND("extraCheesePrice"::numeric, 2)) AS "foodWouldRound",
      (SELECT COUNT(*)::int FROM "Order" WHERE "total"::numeric <> ROUND("total"::numeric, 2) OR "subtotal"::numeric <> ROUND("subtotal"::numeric, 2) OR "deliveryFee"::numeric <> ROUND("deliveryFee"::numeric, 2) OR "discountAmount"::numeric <> ROUND("discountAmount"::numeric, 2) OR "refundedAmount"::numeric <> ROUND("refundedAmount"::numeric, 2)) AS "orderWouldRound",
      (SELECT COUNT(*)::int FROM "OrderItem" WHERE "price"::numeric <> ROUND("price"::numeric, 2)) AS "itemWouldRound",
      (SELECT COUNT(*)::int FROM "FoodIssueReport" WHERE "refundAmount"::numeric <> ROUND("refundAmount"::numeric, 2)) AS "refundWouldRound",
      (SELECT COUNT(*)::int FROM "DeliveryZone" WHERE "deliveryFee"::numeric <> ROUND("deliveryFee"::numeric, 2) OR "minimumOrder"::numeric <> ROUND("minimumOrder"::numeric, 2)) AS "zoneWouldRound",
      (SELECT COUNT(*)::int FROM "Coupon" WHERE "minimumOrder"::numeric <> ROUND("minimumOrder"::numeric, 2) OR "value"::numeric <> ROUND("value"::numeric, 4)) AS "couponWouldRound",
      (SELECT COUNT(*)::int FROM "Food", jsonb_array_elements("optionalIngredients") ingredient WHERE jsonb_typeof(ingredient->'price') <> 'number' OR (ingredient->>'price')::numeric <> ROUND((ingredient->>'price')::numeric, 2)) AS "optionWouldRound",
      (SELECT COUNT(*)::int FROM "Food") AS "foodRows",
      (SELECT COUNT(*)::int FROM "Order") AS "orderRows",
      (SELECT COUNT(*)::int FROM "OrderItem") AS "itemRows",
      (SELECT COUNT(*)::int FROM "FoodIssueReport") AS "refundRows",
      ((SELECT COUNT(*) FROM "Food" WHERE "price" IS NULL OR "extraCheesePrice" IS NULL)
        + (SELECT COUNT(*) FROM "Order" WHERE "total" IS NULL OR "subtotal" IS NULL OR "deliveryFee" IS NULL OR "discountAmount" IS NULL OR "refundedAmount" IS NULL)
        + (SELECT COUNT(*) FROM "OrderItem" WHERE "price" IS NULL)
        + (SELECT COUNT(*) FROM "FoodIssueReport" WHERE "refundAmount" IS NULL)
        + (SELECT COUNT(*) FROM "DeliveryZone" WHERE "deliveryFee" IS NULL OR "minimumOrder" IS NULL)
        + (SELECT COUNT(*) FROM "Coupon" WHERE "value" IS NULL OR "minimumOrder" IS NULL))::int AS "coreMoneyNullRows",
      (SELECT COUNT(*)::int FROM "Order" WHERE "exchangeRateUsed" IS NULL) AS "historicalRateNullRows",
      (SELECT COUNT(*)::int FROM "RestaurantSettings") AS "settingsRows",
      (SELECT MD5(COALESCE(STRING_AGG("id" || ':' || ROUND("price"::numeric, 2)::text || ':' || ROUND("extraCheesePrice"::numeric, 2)::text, '|' ORDER BY "id"), '')) FROM "Food") AS "foodFingerprint",
      (SELECT MD5(COALESCE(STRING_AGG("id" || ':' || ROUND("total"::numeric, 2)::text || ':' || ROUND("subtotal"::numeric, 2)::text || ':' || ROUND("deliveryFee"::numeric, 2)::text || ':' || ROUND("discountAmount"::numeric, 2)::text || ':' || ROUND("refundedAmount"::numeric, 2)::text, '|' ORDER BY "id"), '')) FROM "Order") AS "orderFingerprint",
      (SELECT MD5(COALESCE(STRING_AGG("id"::text || ':' || ROUND("price"::numeric, 2)::text, '|' ORDER BY "id"), '')) FROM "OrderItem") AS "itemFingerprint",
      (SELECT MD5(COALESCE(STRING_AGG("id" || ':' || ROUND("refundAmount"::numeric, 2)::text, '|' ORDER BY "id"), '')) FROM "FoodIssueReport") AS "refundFingerprint"
  `;
  if (!compatibility) throw new Error("Money compatibility query returned no result.");

  const wouldRound = Object.entries(compatibility)
    .filter(([key]) => key.endsWith("WouldRound"))
    .reduce((total, [, value]) => total + Number(value), 0);
  if (wouldRound !== 0) {
    throw new Error(
      `Money migration must stop: ${wouldRound} existing row(s) would be rounded.`,
    );
  }

  const types = await prisma.$queryRaw<
    Array<{
      tableName: string;
      columnName: string;
      dataType: string;
      precision: number | null;
      scale: number | null;
    }>
  >`
    SELECT
      table_name AS "tableName",
      column_name AS "columnName",
      data_type AS "dataType",
      numeric_precision::int AS precision,
      numeric_scale::int AS scale
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (table_name, column_name) IN (
        ('Food', 'price'),
        ('Food', 'extraCheesePrice'),
        ('Order', 'total'),
        ('Order', 'subtotal'),
        ('Order', 'deliveryFee'),
        ('Order', 'discountAmount'),
        ('Order', 'refundedAmount'),
        ('Order', 'exchangeRateUsed'),
        ('OrderItem', 'price'),
        ('FoodIssueReport', 'refundAmount'),
        ('DeliveryZone', 'deliveryFee'),
        ('DeliveryZone', 'minimumOrder'),
        ('Coupon', 'value'),
        ('Coupon', 'minimumOrder'),
        ('RestaurantSettings', 'usdToLbpRate')
      )
    ORDER BY table_name, column_name
  `;

  console.log(
    JSON.stringify(
      { status: "PASS", compatibility, columnTypes: types },
      null,
      2,
    ),
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      "MONEY MIGRATION VERIFICATION: FAIL",
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
