import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function assertRejects(operation: () => Promise<unknown>, message: string) {
  try {
    await operation();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes(message.toLowerCase())
    ) {
      return;
    }
    throw error;
  }
  throw new Error(`Expected checkout rejection containing: ${message}`);
}

async function run() {
  const [{ default: prisma }, checkoutModule] = await Promise.all([
    import("../src/lib/prisma"),
    import("../src/server/checkoutService"),
  ]);
  const prefix = `launch-config-${randomUUID().slice(0, 8)}`;
  const user = await prisma.user.create({
    data: { name: "Launch Config Test", email: `${prefix}@example.invalid` },
  });
  const type = await prisma.foodType.create({
    data: { name: `${prefix}-type` },
  });
  const food = await prisma.food.create({
    data: {
      name: `${prefix}-food`,
      price: 10,
      qty: 20,
      minStock: 0,
      typeId: type.id,
    },
  });
  const zone = await prisma.deliveryZone.create({
    data: {
      name: `${prefix}-zone`,
      description: "Test-only delivery zone",
      deliveryFee: 3,
      minimumOrder: 20,
      estimatedMinutes: 30,
      isAvailable: true,
    },
  });
  const open = async () => ({ isOpen: true, message: "Open" });
  const enabled = () => ({
    deliveryEnabled: true,
    pickupEnabled: true,
    cashPaymentEnabled: true,
    deliveryRulesApproved: true,
    pickupInstructions: "Test-only pickup instructions",
    pickupMinimumOrderUsd: "15.00",
  });
  const input = (
    fulfillmentType: "delivery" | "pickup",
    quantity: number,
    deliveryZoneId?: string,
  ) => ({
    checkoutRequestId: randomUUID(),
    items: [
      {
        id: food.id,
        cartQty: quantity,
        extraCheese: false,
        removedIngredients: [],
        addedIngredientNames: [],
      },
    ],
    customerName: "Launch Test",
    customerPhone: "+96170000000",
    fulfillmentType,
    customerAddress:
      fulfillmentType === "delivery" ? "Test address" : undefined,
    deliveryZoneId,
  });
  const results: Record<string, boolean> = {};

  try {
    await assertRejects(
      () =>
        checkoutModule.checkoutForAuthenticatedUser(
          user,
          input("delivery", 1, zone.id),
          { restaurantStatus: open, orderingConfig: enabled },
        ),
      "minimum order",
    );
    results.deliveryMinimumEnforced = true;

    const delivery = await checkoutModule.checkoutForAuthenticatedUser(
      user,
      input("delivery", 2, zone.id),
      { restaurantStatus: open, orderingConfig: enabled },
    );
    assert(
      delivery.deliveryFee.toFixed(2) === "3.00",
      "Delivery fee was not applied.",
    );
    assert(delivery.total.toFixed(2) === "23.00", "Delivery total is incorrect.");
    assert(
      delivery.paymentMethod === "Cash on Delivery",
      "Delivery payment text is incorrect.",
    );
    results.deliveryFeeApplied = true;

    await assertRejects(
      () =>
        checkoutModule.checkoutForAuthenticatedUser(user, input("pickup", 1), {
          restaurantStatus: open,
          orderingConfig: enabled,
        }),
      "minimum pickup order",
    );
    results.pickupMinimumEnforced = true;

    const pickup = await checkoutModule.checkoutForAuthenticatedUser(
      user,
      input("pickup", 2),
      { restaurantStatus: open, orderingConfig: enabled },
    );
    assert(
      pickup.deliveryFee.toFixed(2) === "0.00",
      "Pickup added a delivery fee.",
    );
    assert(
      pickup.paymentMethod === "Cash on Pickup",
      "Pickup payment text is incorrect.",
    );
    results.pickupConfigured = true;

    await assertRejects(
      () =>
        checkoutModule.checkoutForAuthenticatedUser(
          user,
          input("delivery", 2, randomUUID()),
          { restaurantStatus: open, orderingConfig: enabled },
        ),
      "not available",
    );
    results.unknownZoneRejected = true;

    await assertRejects(
      () =>
        checkoutModule.checkoutForAuthenticatedUser(
          user,
          input("delivery", 2, zone.id),
          {
            restaurantStatus: open,
            orderingConfig: () => ({ ...enabled(), deliveryEnabled: false }),
          },
        ),
      "Delivery ordering is not available",
    );
    results.disabledDeliveryRejected = true;

    console.log(JSON.stringify({ status: "PASS", results }, null, 2));
  } finally {
    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    const orderIds = orders.map((order) => order.id);
    await prisma.stockMovement.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.deliveryZone.delete({ where: { id: zone.id } });
    await prisma.food.delete({ where: { id: food.id } });
    await prisma.foodType.delete({ where: { id: type.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
}

run().catch((error: unknown) => {
  console.error(
    "BUSINESS CONFIGURATION: FAIL",
    error instanceof Error ? error.message : "Unknown error",
  );
  process.exitCode = 1;
});
