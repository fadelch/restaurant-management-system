import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import prisma from "../src/lib/prisma";
import { isAccountDisabled } from "../src/lib/accountStatus";
import { removeUserAccount } from "../src/server/accountRemovalService";

const runId = randomUUID();
const actorId = randomUUID();
const customerId = randomUUID();
const historyFreeUserId = randomUUID();
const foodTypeId = randomUUID();
const foodId = randomUUID();
const orderId = randomUUID();
const issueId = randomUUID();
const couponId = randomUUID();

async function cleanup() {
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { adminId: actorId },
        { entityId: { in: [customerId, historyFreeUserId, orderId, issueId] } },
      ],
    },
  });
  await prisma.foodIssueReport.deleteMany({ where: { id: issueId } });
  await prisma.stockMovement.deleteMany({
    where: { OR: [{ foodId }, { orderId }] },
  });
  await prisma.orderItem.deleteMany({ where: { orderId } });
  await prisma.order.deleteMany({ where: { id: orderId } });
  await prisma.coupon.deleteMany({ where: { id: couponId } });
  await prisma.user.deleteMany({
    where: { id: { in: [customerId, historyFreeUserId, actorId] } },
  });
  await prisma.food.deleteMany({ where: { id: foodId } });
  await prisma.foodType.deleteMany({ where: { id: foodTypeId } });
}

async function rejectsForeignKeyDelete(operation: () => Promise<unknown>) {
  try {
    await operation();
    return false;
  } catch (error) {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2003"
    );
  }
}

async function main() {
  await cleanup();
  try {
    await prisma.user.create({
      data: {
        id: actorId,
        name: "Run 2 Admin",
        email: `run2-admin-${runId}@example.test`,
        password: "not-used-by-test",
        isAdmin: true,
      },
    });
    await prisma.user.create({
      data: {
        id: customerId,
        name: "Historical Customer",
        email: `run2-customer-${runId}@example.test`,
        password: "not-used-by-test",
      },
    });
    await prisma.user.create({
      data: {
        id: historyFreeUserId,
        name: "History Free Customer",
        email: `run2-empty-${runId}@example.test`,
        password: "not-used-by-test",
      },
    });
    await prisma.foodType.create({
      data: { id: foodTypeId, name: `Run 2 Type ${runId}` },
    });
    await prisma.food.create({
      data: {
        id: foodId,
        name: "Original Ordered Food",
        qty: 10,
        price: 12.5,
        typeId: foodTypeId,
      },
    });
    await prisma.order.create({
      data: {
        id: orderId,
        orderNumber: `RUN2-${runId}`,
        userId: customerId,
        total: 25,
        subtotal: 25,
        status: "done",
        paymentStatus: "refunded",
        refundedAmount: 12.5,
        customerName: "Historical Customer",
        customerPhone: "+96170000000",
        customerAddress: "Order-time delivery address",
        fulfillmentType: "delivery",
        paymentMethod: "Pay on Delivery",
      },
    });
    const orderItem = await prisma.orderItem.create({
      data: {
        orderId,
        foodId,
        foodName: "Original Ordered Food",
        quantity: 2,
        price: 12.5,
      },
    });
    await prisma.foodIssueReport.create({
      data: {
        id: issueId,
        orderId,
        orderItemId: orderItem.id,
        userId: customerId,
        reason: "wrong_item",
        details: "Run 2 historical issue report",
        quantity: 1,
        status: "approved",
        refundAmount: 12.5,
      },
    });
    await prisma.stockMovement.create({
      data: {
        foodId,
        adminId: actorId,
        orderId,
        change: -2,
        previousQty: 12,
        newQty: 10,
        reason: "Run 2 order purchase",
      },
    });
    await prisma.coupon.create({
      data: {
        id: couponId,
        code: `RUN2-${runId}`,
        description: "Run 2 assigned coupon",
        discountType: "fixed",
        value: 1,
        userId: historyFreeUserId,
      },
    });

    const removal = await removeUserAccount(customerId, {
      id: actorId,
      email: `run2-admin-${runId}@example.test`,
    });
    assert.equal(removal.mode, "anonymized");

    const removedCustomer = await prisma.user.findUniqueOrThrow({
      where: { id: customerId },
    });
    assert.equal(removedCustomer.name, null);
    assert.equal(removedCustomer.password, null);
    assert.equal(removedCustomer.isAdmin, false);
    assert.equal(removedCustomer.isBanned, true);
    assert.ok(removedCustomer.deletedAt);
    assert.equal(removedCustomer.email, null);
    assert.equal(isAccountDisabled(removedCustomer), true);

    const historicalOrder = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        user: true,
        items: { include: { issueReports: true } },
        issueReports: true,
        stockMovements: true,
      },
    });
    assert.equal(historicalOrder.customerName, "Historical Customer");
    assert.equal(historicalOrder.customerPhone, "+96170000000");
    assert.equal(
      historicalOrder.customerAddress,
      "Order-time delivery address",
    );
    assert.equal(historicalOrder.total.equals(25), true);
    assert.equal(historicalOrder.refundedAmount.equals(12.5), true);
    assert.equal(historicalOrder.items.length, 1);
    assert.equal(historicalOrder.items[0]?.foodName, "Original Ordered Food");
    assert.equal(historicalOrder.items[0]?.issueReports.length, 1);
    assert.equal(historicalOrder.issueReports.length, 1);
    assert.equal(historicalOrder.stockMovements.length, 1);
    assert.equal(historicalOrder.user.deletedAt !== null, true);

    assert.equal(
      await rejectsForeignKeyDelete(() =>
        prisma.user.delete({ where: { id: customerId } }),
      ),
      true,
      "The database must reject direct deletion of an ordered customer.",
    );
    assert.equal(
      await rejectsForeignKeyDelete(() =>
        prisma.order.delete({ where: { id: orderId } }),
      ),
      true,
      "The database must reject direct deletion of an order with history.",
    );
    assert.equal(
      await rejectsForeignKeyDelete(() =>
        prisma.food.delete({ where: { id: foodId } }),
      ),
      true,
      "The database must reject direct deletion of an ordered food.",
    );
    await prisma.food.update({ where: { id: foodId }, data: { qty: 0 } });
    assert.equal(
      await prisma.orderItem.count({ where: { id: orderItem.id } }),
      1,
    );

    const removalAudit = await prisma.auditLog.findFirst({
      where: {
        action: "ANONYMIZE_USER",
        entityId: customerId,
        adminId: actorId,
      },
    });
    assert.ok(removalAudit, "Account-removal audit history must remain.");

    const historyFreeRemoval = await removeUserAccount(historyFreeUserId, {
      id: actorId,
      email: `run2-admin-${runId}@example.test`,
    });
    assert.equal(historyFreeRemoval.mode, "deleted");
    assert.equal(
      await prisma.user.count({ where: { id: historyFreeUserId } }),
      0,
    );
    const retainedCoupon = await prisma.coupon.findUniqueOrThrow({
      where: { id: couponId },
    });
    assert.equal(retainedCoupon.userId, null);

    console.log(
      JSON.stringify(
        {
          status: "PASS",
          checks: {
            orderedCustomerAnonymized: true,
            authenticationDisabled: true,
            orderAndItemsRetained: true,
            adminOrderQueryRetained: true,
            refundsIssuesAndAuditRetained: true,
            directUserOrderAndFoodDeletesBlocked: true,
            historyFreeCustomerDeleted: true,
            assignedCouponRetained: true,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
