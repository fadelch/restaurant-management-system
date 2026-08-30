import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import type { CheckoutInput } from "../src/server/checkoutService";

loadEnvConfig(process.cwd());

type TestUser = { id: string };
type TestFood = { id: string; name: string; price: number };

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function checkoutInput(
  food: TestFood,
  checkoutRequestId = randomUUID(),
  quantity = 1,
): CheckoutInput {
  return {
    checkoutRequestId,
    items: [
      {
        id: food.id,
        cartQty: quantity,
        extraCheese: false,
        removedIngredients: [],
        addedIngredientNames: [],
      },
    ],
    customerName: "Checkout Test",
    customerPhone: "+96170000000",
    fulfillmentType: "pickup",
  };
}

function resultCounts(results: PromiseSettledResult<unknown>[]) {
  return {
    fulfilled: results.filter((result) => result.status === "fulfilled").length,
    rejected: results.filter((result) => result.status === "rejected").length,
  };
}

async function run() {
  const [{ default: prisma }, { hash }, checkoutModule] = await Promise.all([
    import("../src/lib/prisma"),
    import("bcrypt"),
    import("../src/server/checkoutService"),
  ]);
  const { checkoutForAuthenticatedUser } = checkoutModule;
  const runId = randomUUID().slice(0, 8);
  const prefix = `codex-checkout-${runId}`;
  const emailPrefix = `${prefix}-`;
  const users: TestUser[] = [];
  const results: Record<string, unknown> = {};
  const runtime = {
    restaurantStatus: async () => ({ isOpen: true, message: "Open" }),
  };

  async function cleanupFixtures(prefixToClean: string) {
    const fixtureUsers = await prisma.user.findMany({
      where: { email: { startsWith: `${prefixToClean}` } },
      select: { id: true },
    });
    const fixtureTypes = await prisma.foodType.findMany({
      where: { name: { startsWith: prefixToClean } },
      select: { id: true },
    });
    const userIds = fixtureUsers.map((user) => user.id);
    const typeIds = fixtureTypes.map((type) => type.id);
    const fixtureFoods = await prisma.food.findMany({
      where: { typeId: { in: typeIds } },
      select: { id: true },
    });
    const foodIds = fixtureFoods.map((food) => food.id);
    const fixtureOrders = await prisma.order.findMany({
      where: { userId: { in: userIds } },
      select: { id: true },
    });
    const orderIds = fixtureOrders.map((order) => order.id);

    await prisma.foodIssueReport.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.stockMovement.deleteMany({
      where: {
        OR: [
          { orderId: { in: orderIds } },
          { foodId: { in: foodIds } },
        ],
      },
    });
    await prisma.orderItem.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.favorite.deleteMany({
      where: {
        OR: [{ userId: { in: userIds } }, { foodId: { in: foodIds } }],
      },
    });
    await prisma.food.deleteMany({ where: { id: { in: foodIds } } });
    await prisma.foodType.deleteMany({ where: { id: { in: typeIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }

  try {
    await cleanupFixtures("codex-checkout-");
    const passwordHash = await hash(randomUUID(), 12);
    await prisma.user.createMany({
      data: Array.from({ length: 20 }, (_, index) => ({
        name: `Checkout Test ${index}`,
        email: `${emailPrefix}${index}@example.invalid`,
        password: passwordHash,
        confirm_password: null,
      })),
    });
    users.push(
      ...(await prisma.user.findMany({
        where: { email: { startsWith: emailPrefix } },
        orderBy: { email: "asc" },
        select: { id: true },
      })),
    );
    assert(users.length === 20, "Could not create 20 isolated test users.");

    const foodType = await prisma.foodType.create({
      data: { name: `${prefix}-type` },
    });
    const foodDefinitions = [
      ...Array.from({ length: 20 }, (_, index) => ({
        name: `${prefix}-different-${index}`,
        qty: 1,
      })),
      { name: `${prefix}-same-20`, qty: 20 },
      { name: `${prefix}-same-5`, qty: 5 },
      { name: `${prefix}-last-item`, qty: 1 },
      { name: `${prefix}-sequential`, qty: 10 },
      { name: `${prefix}-concurrent-key`, qty: 10 },
      { name: `${prefix}-user-isolation`, qty: 2 },
      { name: `${prefix}-tamper`, qty: 2 },
      { name: `${prefix}-outage`, qty: 2 },
    ];
    await prisma.food.createMany({
      data: foodDefinitions.map((food, index) => ({
        ...food,
        price: 10 + index,
        minStock: 0,
        typeId: foodType.id,
      })),
    });
    const foods = await prisma.food.findMany({
      where: { typeId: foodType.id },
      select: { id: true, name: true, price: true },
    });
    const foodByName = new Map(foods.map((food) => [food.name, food]));
    const namedFood = (suffix: string) => {
      const food = foodByName.get(`${prefix}-${suffix}`);
      if (!food) throw new Error(`Missing test food: ${suffix}`);
      return food;
    };

    const differentFoods = Array.from({ length: 20 }, (_, index) =>
      namedFood(`different-${index}`),
    );
    const different = await Promise.allSettled(
      users.map((user, index) =>
        checkoutForAuthenticatedUser(
          user,
          checkoutInput(differentFoods[index]),
          runtime,
        ),
      ),
    );
    assert(
      different.every((result) => result.status === "fulfilled"),
      "Different-food concurrency did not complete 20/20 orders.",
    );
    const differentStock = await prisma.food.aggregate({
      where: { id: { in: differentFoods.map((food) => food.id) } },
      _sum: { qty: true },
    });
    assert(differentStock._sum.qty === 0, "Different-food stock is incorrect.");
    results.differentFoods = { ...resultCounts(different), stock: 0 };

    const sameTwentyFood = namedFood("same-20");
    const sameTwenty = await Promise.allSettled(
      users.map((user) =>
        checkoutForAuthenticatedUser(user, checkoutInput(sameTwentyFood), runtime),
      ),
    );
    const sameTwentyStock = await prisma.food.findUniqueOrThrow({
      where: { id: sameTwentyFood.id },
      select: { qty: true },
    });
    assert(
      sameTwenty.every((result) => result.status === "fulfilled"),
      "Same-food stock=20 concurrency did not complete 20/20 orders.",
    );
    assert(sameTwentyStock.qty === 0, "Same-food stock=20 did not reach zero.");
    results.sameFoodStock20 = { ...resultCounts(sameTwenty), stock: 0 };

    const sameFiveFood = namedFood("same-5");
    const sameFive = await Promise.allSettled(
      users.map((user) =>
        checkoutForAuthenticatedUser(user, checkoutInput(sameFiveFood), runtime),
      ),
    );
    const sameFiveCounts = resultCounts(sameFive);
    const safeStockFailures = sameFive.filter(
      (result) =>
        result.status === "rejected" &&
        result.reason instanceof Error &&
        result.reason.name === "InsufficientStockError",
    ).length;
    const sameFiveStock = await prisma.food.findUniqueOrThrow({
      where: { id: sameFiveFood.id },
      select: { qty: true },
    });
    assert(
      sameFiveCounts.fulfilled === 5 && safeStockFailures === 15,
      "Same-food stock=5 did not produce 5 orders and 15 safe stock failures.",
    );
    assert(sameFiveStock.qty === 0, "Same-food stock=5 did not reach zero.");
    results.sameFoodStock5 = {
      ...sameFiveCounts,
      safeStockFailures,
      stock: 0,
    };

    const lastItemFood = namedFood("last-item");
    const lastItem = await Promise.allSettled(
      users.slice(0, 2).map((user) =>
        checkoutForAuthenticatedUser(user, checkoutInput(lastItemFood), runtime),
      ),
    );
    const lastItemCounts = resultCounts(lastItem);
    const lastItemStock = await prisma.food.findUniqueOrThrow({
      where: { id: lastItemFood.id },
      select: { qty: true },
    });
    assert(
      lastItemCounts.fulfilled === 1 && lastItemCounts.rejected === 1,
      "The last-item race did not produce exactly one order.",
    );
    assert(lastItemStock.qty === 0, "The last-item stock did not reach zero.");
    results.lastItemRace = { ...lastItemCounts, stock: 0 };

    const sequentialFood = namedFood("sequential");
    const sequentialKey = randomUUID();
    const sequentialInput = checkoutInput(sequentialFood, sequentialKey);
    const sequentialFirst = await checkoutForAuthenticatedUser(
      users[0],
      sequentialInput,
      runtime,
    );
    const sequentialSecond = await checkoutForAuthenticatedUser(
      users[0],
      sequentialInput,
      runtime,
    );
    const sequentialOrders = await prisma.order.count({
      where: { userId: users[0].id, checkoutRequestId: sequentialKey },
    });
    assert(
      sequentialFirst.id === sequentialSecond.id && sequentialOrders === 1,
      "Sequential idempotent retries created more than one order.",
    );
    results.sequentialIdempotency = { orders: sequentialOrders };

    const concurrentKeyFood = namedFood("concurrent-key");
    const concurrentKey = randomUUID();
    const concurrentInput = checkoutInput(concurrentKeyFood, concurrentKey);
    const concurrentRetries = await Promise.allSettled(
      Array.from({ length: 20 }, () =>
        checkoutForAuthenticatedUser(users[1], concurrentInput, runtime),
      ),
    );
    assert(
      concurrentRetries.every((result) => result.status === "fulfilled"),
      "Concurrent idempotent retries did not all return safely.",
    );
    const concurrentOrderIds = new Set(
      concurrentRetries.flatMap((result) =>
        result.status === "fulfilled" ? [result.value.id] : [],
      ),
    );
    const concurrentOrders = await prisma.order.count({
      where: { userId: users[1].id, checkoutRequestId: concurrentKey },
    });
    assert(
      concurrentOrderIds.size === 1 && concurrentOrders === 1,
      "Concurrent idempotent retries created duplicate orders.",
    );
    results.concurrentIdempotency = {
      ...resultCounts(concurrentRetries),
      uniqueOrders: concurrentOrders,
    };

    let modifiedPayloadRejected = false;
    try {
      await checkoutForAuthenticatedUser(
        users[0],
        checkoutInput(sequentialFood, sequentialKey, 2),
        runtime,
      );
    } catch (error) {
      modifiedPayloadRejected =
        error instanceof Error && error.name === "CheckoutRequestConflictError";
    }
    assert(modifiedPayloadRejected, "A modified payload reused an existing key.");
    results.modifiedPayload = { safelyRejected: true };

    const isolationFood = namedFood("user-isolation");
    const sharedKey = randomUUID();
    const isolatedUsers = await Promise.all([
      checkoutForAuthenticatedUser(
        users[2],
        checkoutInput(isolationFood, sharedKey),
        runtime,
      ),
      checkoutForAuthenticatedUser(
        users[3],
        checkoutInput(isolationFood, sharedKey),
        runtime,
      ),
    ]);
    assert(
      new Set(isolatedUsers.map((order) => order.id)).size === 2,
      "Idempotency keys were not isolated by authenticated user.",
    );
    results.userKeyIsolation = { orders: 2 };

    const tamperFood = namedFood("tamper");
    const tamperedInput = {
      ...checkoutInput(tamperFood),
      userId: users[4].id,
      total: 0,
      status: "done",
      paymentStatus: "paid",
      items: [
        {
          ...checkoutInput(tamperFood).items[0],
          price: 0,
        },
      ],
    };
    const tamperOrder = await checkoutForAuthenticatedUser(
      users[5],
      tamperedInput,
      runtime,
    );
    const storedTamperOrder = await prisma.order.findUniqueOrThrow({
      where: { id: tamperOrder.id },
      include: { items: true },
    });
    assert(storedTamperOrder.userId === users[5].id, "Client user ID was trusted.");
    assert(storedTamperOrder.total === tamperFood.price, "Client total was trusted.");
    assert(
      storedTamperOrder.items[0]?.price === tamperFood.price,
      "Client item price was trusted.",
    );
    assert(
      storedTamperOrder.status === "pending" &&
        storedTamperOrder.paymentStatus === "pending",
      "Client order or payment status was trusted.",
    );
    results.tamperedCheckout = { serverValuesPreserved: true };

    const outageFood = namedFood("outage");
    const outageKey = randomUUID();
    let outageSanitized = false;
    try {
      await checkoutForAuthenticatedUser(
        users[6],
        checkoutInput(outageFood, outageKey),
        {
          ...runtime,
          afterStockUpdate: async () => {
            throw Object.assign(new Error("Simulated database connection loss"), {
              code: "P1001",
            });
          },
        },
      );
    } catch (error) {
      outageSanitized =
        error instanceof Error &&
        error.message ===
          "We couldn't complete your order right now. Please try again.";
    }
    const [outageFoodAfter, outageOrders, outageMovements] = await Promise.all([
      prisma.food.findUniqueOrThrow({
        where: { id: outageFood.id },
        select: { qty: true },
      }),
      prisma.order.count({
        where: { userId: users[6].id, checkoutRequestId: outageKey },
      }),
      prisma.stockMovement.count({ where: { foodId: outageFood.id } }),
    ]);
    assert(outageSanitized, "A database failure was not sanitized.");
    assert(
      outageFoodAfter.qty === 2 && outageOrders === 0 && outageMovements === 0,
      "A database failure left partial checkout data.",
    );
    results.databaseFailure = {
      sanitized: true,
      stockRolledBack: true,
      partialOrders: outageOrders,
      partialMovements: outageMovements,
    };

    const fixtureFoods = await prisma.food.findMany({
      where: { typeId: foodType.id },
      select: { qty: true },
    });
    assert(
      fixtureFoods.every((food) => food.qty >= 0),
      "A checkout produced negative stock.",
    );
    const emptyOrders = await prisma.order.count({
      where: {
        userId: { in: users.map((user) => user.id) },
        items: { none: {} },
      },
    });
    assert(emptyOrders === 0, "A partial order without items was committed.");
    results.invariants = { negativeStock: 0, partialOrders: emptyOrders };

    console.log(JSON.stringify({ status: "PASS", results }, null, 2));
  } finally {
    await cleanupFixtures(prefix);
    await prisma.$disconnect();
  }
}

run().catch((error: unknown) => {
  console.error(
    "CHECKOUT CONCURRENCY: FAIL",
    error instanceof Error ? error.message : "Unknown error",
  );
  process.exitCode = 1;
});
