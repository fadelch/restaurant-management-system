import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import prisma from "../src/lib/prisma";
import {
  calculateFixedDiscount,
  calculateLineTotal,
  calculateOrderTotal,
  calculatePercentageDiscount,
  calculateRefundLimit,
  calculateUnitPrice,
  convertUsdToLbpDecimal,
  sumUsd,
} from "../src/lib/money";
import {
  addUsdAmounts,
  formatUsdWithLbp,
  multiplyUsd,
} from "../src/lib/currency";
import { hasAtMostDecimalPlaces } from "../src/lib/moneyInput";
import { updateUsdToLbpRateForAdmin } from "../src/server/currencySettingsService";
import { reviewFoodIssueForAdmin } from "../src/server/refundService";

const runId = randomUUID();
const adminId = randomUUID();
const customerId = randomUUID();
const foodTypeId = randomUUID();
const foodId = randomUUID();
const orderId = randomUUID();
const firstIssueId = randomUUID();
const secondIssueId = randomUUID();
const adminEmail = `run3-admin-${runId}@example.test`;
const actor = { id: adminId, email: adminEmail };

type Result = { expected: string; actual: string; status: "PASS" };
const results: Record<string, Result> = {};

function expectDecimal(name: string, actual: { toFixed: (places: number) => string }, expected: string) {
  const value = actual.toFixed(2);
  assert.equal(value, expected, name);
  results[name] = { expected, actual: value, status: "PASS" };
}

function expectValue(name: string, actual: string | number | boolean, expected: string | number | boolean) {
  assert.equal(actual, expected, name);
  results[name] = {
    expected: String(expected),
    actual: String(actual),
    status: "PASS",
  };
}

async function restoreSettings(
  previous: Awaited<ReturnType<typeof prisma.restaurantSettings.findUnique>>,
) {
  if (!previous) {
    await prisma.restaurantSettings.deleteMany({ where: { id: 1 } });
    return;
  }
  await prisma.$executeRaw`
    UPDATE "public"."RestaurantSettings"
    SET "usdToLbpRate" = ${previous.usdToLbpRate},
        "updatedAt" = ${previous.updatedAt},
        "updatedById" = ${previous.updatedById}
    WHERE "id" = 1
  `;
}

async function cleanup() {
  await prisma.auditLog.deleteMany({ where: { adminId } });
  await prisma.foodIssueReport.deleteMany({
    where: { id: { in: [firstIssueId, secondIssueId] } },
  });
  await prisma.stockMovement.deleteMany({ where: { orderId } });
  await prisma.orderItem.deleteMany({ where: { orderId } });
  await prisma.order.deleteMany({ where: { id: orderId } });
  await prisma.food.deleteMany({ where: { id: foodId } });
  await prisma.foodType.deleteMany({ where: { id: foodTypeId } });
  await prisma.user.deleteMany({ where: { id: { in: [customerId, adminId] } } });
}

async function main() {
  expectDecimal("0.1 + 0.2", sumUsd([0.1, 0.2]), "0.30");
  expectDecimal("multiple order items", sumUsd([4.25, 7.1, 0.65]), "12.00");
  expectDecimal("quantity multiplication", calculateLineTotal(3.33, 3), "9.99");
  expectDecimal(
    "extra ingredient pricing",
    calculateUnitPrice(4, [1.5, 0.3]),
    "5.80",
  );
  expectDecimal(
    "percentage coupon 10%",
    calculatePercentageDiscount(9.99, 10),
    "1.00",
  );
  expectDecimal(
    "percentage coupon 15%",
    calculatePercentageDiscount(13.37, 15),
    "2.01",
  );
  expectDecimal(
    "percentage coupon 33%",
    calculatePercentageDiscount(0.99, 33),
    "0.33",
  );
  expectDecimal("fixed discount", calculateFixedDiscount(20, 3.25), "3.25");
  expectDecimal(
    "discount greater than subtotal",
    calculateFixedDiscount(5, 8),
    "5.00",
  );
  expectDecimal(
    "delivery fee and final total",
    calculateOrderTotal(9.99, 2.5, 1),
    "11.49",
  );
  expectDecimal(
    "partial refund",
    calculateRefundLimit({
      orderTotal: 20,
      alreadyRefunded: 3.33,
      unitPrice: 5,
      quantity: 2,
    }),
    "10.00",
  );
  expectDecimal(
    "multiple partial refunds capped",
    calculateRefundLimit({
      orderTotal: 10,
      alreadyRefunded: 6,
      unitPrice: 6,
      quantity: 1,
    }),
    "4.00",
  );
  expectDecimal("very small valid amount", calculateLineTotal(0.01, 1), "0.01");
  expectDecimal(
    "large order total",
    calculateLineTotal("999999999.99", 1000),
    "999999999990.00",
  );
  expectValue(
    "USD to LBP whole-value conversion",
    convertUsdToLbpDecimal(10.25, 89500).toFixed(0),
    "917375",
  );
  expectValue(
    "missing exchange-rate behavior",
    formatUsdWithLbp(10, null).lbp,
    "LBP rate not configured",
  );
  expectValue(
    "client LBP conversion",
    formatUsdWithLbp(10.25, 89500).lbp,
    "L.L 917,375",
  );
  expectValue("client cent addition", addUsdAmounts([0.1, 0.2]), 0.3);
  expectValue("client quantity multiplication", multiplyUsd(3.33, 3), 9.99);
  expectValue("excess USD precision rejected", hasAtMostDecimalPlaces(1.001, 2), false);

  const previousSettings = await prisma.restaurantSettings.findUnique({
    where: { id: 1 },
  });
  await cleanup();
  try {
    await prisma.user.createMany({
      data: [
        {
          id: adminId,
          name: "Run 3 Admin",
          email: adminEmail,
          password: "not-used-by-test",
          isAdmin: true,
        },
        {
          id: customerId,
          name: "Run 3 Customer",
          email: `run3-customer-${runId}@example.test`,
          password: "not-used-by-test",
        },
      ],
    });
    await updateUsdToLbpRateForAdmin(actor, 80000);
    await prisma.foodType.create({
      data: { id: foodTypeId, name: `Run 3 Type ${runId}` },
    });
    await prisma.food.create({
      data: {
        id: foodId,
        name: "Run 3 Financial Fixture",
        qty: 2,
        price: 6,
        typeId: foodTypeId,
      },
    });
    await prisma.order.create({
      data: {
        id: orderId,
        userId: customerId,
        total: 10,
        subtotal: 10,
        exchangeRateUsed: 80000,
        status: "done",
        paymentStatus: "done",
        customerName: "Run 3 Customer",
      },
    });
    const orderItem = await prisma.orderItem.create({
      data: {
        orderId,
        foodId,
        foodName: "Run 3 Financial Fixture",
        quantity: 2,
        price: 6,
      },
    });
    await prisma.foodIssueReport.createMany({
      data: [firstIssueId, secondIssueId].map((id) => ({
        id,
        orderId,
        orderItemId: orderItem.id,
        userId: customerId,
        reason: "wrong_item",
        details: "Run 3 concurrent refund fixture",
        quantity: 1,
      })),
    });

    await updateUsdToLbpRateForAdmin(actor, 90000);
    const [historicalOrder, currentSettings, rateAudits] = await Promise.all([
      prisma.order.findUniqueOrThrow({ where: { id: orderId } }),
      prisma.restaurantSettings.findUniqueOrThrow({ where: { id: 1 } }),
      prisma.auditLog.count({
        where: { adminId, action: "UPDATE_USD_LBP_RATE" },
      }),
    ]);
    expectValue(
      "exchange-rate update",
      currentSettings.usdToLbpRate?.toFixed(4) || "",
      "90000.0000",
    );
    expectValue(
      "historical order rate snapshot",
      historicalOrder.exchangeRateUsed?.toFixed(4) || "",
      "80000.0000",
    );
    expectValue("exchange-rate changes audited", rateAudits, 2);

    const concurrentRefunds = await Promise.allSettled([
      reviewFoodIssueForAdmin(actor, {
        id: firstIssueId,
        status: "approved",
        refundAmount: 6,
      }),
      reviewFoodIssueForAdmin(actor, {
        id: secondIssueId,
        status: "approved",
        refundAmount: 6,
      }),
    ]);
    const fulfilled = concurrentRefunds.filter(
      (result) => result.status === "fulfilled",
    ).length;
    const rejected = concurrentRefunds.filter(
      (result) => result.status === "rejected",
    ).length;
    expectValue("concurrent refund accepted count", fulfilled, 1);
    expectValue("concurrent refund safely rejected count", rejected, 1);

    const pendingReport = await prisma.foodIssueReport.findFirstOrThrow({
      where: {
        id: { in: [firstIssueId, secondIssueId] },
        status: "pending",
      },
    });
    await reviewFoodIssueForAdmin(actor, {
      id: pendingReport.id,
      status: "approved",
      refundAmount: 4,
    });
    const fullyRefundedOrder = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    expectValue(
      "sequential partial refunds never exceed total",
      fullyRefundedOrder.refundedAmount.toFixed(2),
      "10.00",
    );

    console.log(JSON.stringify({ status: "PASS", results }, null, 2));
  } finally {
    await restoreSettings(previousSettings);
    await cleanup();
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    "FINANCIAL CORRECTNESS: FAIL",
    error instanceof Error ? error.message : "Unknown error",
  );
  process.exitCode = 1;
});
