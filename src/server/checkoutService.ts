import "server-only";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getRestaurantStatus } from "@/lib/restaurantHours";
import { idSchema, validationMessage } from "@/lib/validation";
import { normalizeOptionalIngredients } from "@/lib/foodOptions";
import { publicUserSelect } from "@/lib/prismaSelects";
import { Prisma } from "@/generated/prisma";
import {
  CheckoutRequestConflictError,
  InsufficientStockError,
  checkoutRequestHash,
  databaseErrorCode,
  databaseNativeErrorCode,
  isDatabaseError,
  isUniqueConstraintError,
  withCheckoutRetry,
} from "@/lib/checkoutSafety";
import {
  addOperationalBreadcrumb,
  captureOperationalError,
} from "@/lib/monitoring";
import {
  calculateFixedDiscount,
  calculateLineTotal,
  calculateOrderTotal,
  calculatePercentageDiscount,
  calculateUnitPrice,
  decimal,
  formatUsdForMessage,
  sumUsd,
} from "@/lib/money";
import { getCurrentUsdToLbpRate } from "@/lib/currencySettings";
import { serializeForClient } from "@/lib/serialize";
import { getRestaurantLaunchConfig } from "@/lib/restaurantConfig";
import type { RestaurantOrderingConfig } from "@/types/restaurant";

export const checkoutInputSchema = z.object({
  checkoutRequestId: z.string().uuid(),
  items: z
    .array(
      z.object({
        id: idSchema,
        cartQty: z.coerce.number().int().positive().max(1000),
        extraCheese: z.boolean().default(false),
        removedIngredients: z
          .array(z.string().trim().min(1).max(50))
          .max(30)
          .default([]),
        addedIngredientNames: z
          .array(z.string().trim().min(1).max(50))
          .max(30)
          .default([]),
        customizationNote: z.string().trim().max(300).optional(),
      }),
    )
    .min(1, "Cart is empty.")
    .max(100),
  customerName: z.string().trim().min(2).max(100),
  customerPhone: z.string().trim().min(6).max(30),
  fulfillmentType: z.enum(["delivery", "pickup"]),
  customerAddress: z.string().trim().max(500).optional(),
  mapLocation: z.string().trim().max(500).optional(),
  orderNotes: z.string().trim().max(500).optional(),
  deliveryZoneId: idSchema.optional(),
  couponCode: z.string().trim().max(30).optional(),
});

const checkoutOrderInclude = {
  user: { select: publicUserSelect },
  items: { include: { food: true } },
  deliveryZone: true,
} satisfies Prisma.OrderInclude;

async function findIdempotentOrder(
  userId: string,
  checkoutRequestId: string,
  requestHash: string,
) {
  const existing = await prisma.order.findUnique({
    where: {
      userId_checkoutRequestId: { userId, checkoutRequestId },
    },
    include: checkoutOrderInclude,
  });
  if (!existing) return null;
  if (existing.checkoutRequestHash !== requestHash) {
    throw new CheckoutRequestConflictError();
  }
  return existing;
}

export type CheckoutInput = z.input<typeof checkoutInputSchema>;
type CheckoutRuntime = {
  restaurantStatus?: () => Promise<{ isOpen: boolean; message: string }>;
  orderingConfig?: () => RestaurantOrderingConfig;
  afterStockUpdate?: () => Promise<void>;
};

export async function checkoutForAuthenticatedUser(
  user: { id: string },
  input: CheckoutInput,
  runtime: CheckoutRuntime = {},
) {
  const parsed = checkoutInputSchema.safeParse(input);
  if (!parsed.success) throw new Error(validationMessage(parsed.error));
  const data = parsed.data;
  const requestHash = checkoutRequestHash({
    ...data,
    checkoutRequestId: undefined,
  });
  try {
  addOperationalBreadcrumb("checkout.started", {
    request: requestHash.slice(0, 12),
    items: data.items.length,
  });
  const existingOrder = await findIdempotentOrder(
    user.id,
    data.checkoutRequestId,
    requestHash,
  );
  if (existingOrder) {
    addOperationalBreadcrumb("checkout.idempotent_replay", {
      request: requestHash.slice(0, 12),
    });
    return serializeForClient(existingOrder);
  }
  const ordering = runtime.orderingConfig?.() || getRestaurantLaunchConfig().ordering;
  if (!ordering.cashPaymentEnabled) {
    throw new Error("Cash ordering is not available yet.");
  }
  if (!ordering.deliveryRulesApproved) {
    throw new Error("Delivery and pickup rules require restaurant approval.");
  }
  if (data.fulfillmentType === "delivery" && !ordering.deliveryEnabled) {
    throw new Error("Delivery ordering is not available.");
  }
  if (data.fulfillmentType === "pickup" && !ordering.pickupEnabled) {
    throw new Error("Pickup ordering is not available.");
  }
  const restaurant = await (runtime.restaurantStatus || getRestaurantStatus)();
  if (!restaurant.isOpen) throw new Error(restaurant.message);
  if (data.fulfillmentType === "delivery" && !data.customerAddress)
    throw new Error("Delivery address is required.");
  if (data.fulfillmentType === "delivery" && !data.deliveryZoneId)
    throw new Error("Select a delivery area.");
  const ids = [...new Set(data.items.map((item) => item.id))];
  const foods = await prisma.food.findMany({
    where: { id: { in: ids } },
    include: { type: true },
  });
  if (foods.length !== ids.length)
    throw new Error("Some food items were not found.");
  const foodsById = new Map(foods.map((food) => [food.id, food]));
  const lineDetails = data.items.map((item) => {
    const food = foodsById.get(item.id);
    if (!food) throw new Error("Food item was not found.");
    const allowedIngredients = new Set(food.ingredients);
    const removedIngredients = [...new Set(item.removedIngredients)];
    if (
      removedIngredients.some(
        (ingredient) => !allowedIngredients.has(ingredient),
      )
    ) {
      throw new Error(`The selected ingredients for ${food.name} are invalid.`);
    }
    const availableOptions = normalizeOptionalIngredients(
      food.optionalIngredients,
    );
    const requestedOptionNames = [...new Set(item.addedIngredientNames)];
    const addedIngredients = requestedOptionNames.map((name) => {
      const option = availableOptions.find((entry) => entry.name === name);
      if (!option)
        throw new Error(`${name} is not an available option for ${food.name}.`);
      return option;
    });
    return {
      item,
      food,
      removedIngredients,
      addedIngredients,
      unitPrice: calculateUnitPrice(food.price, [
        ...(item.extraCheese ? [food.extraCheesePrice] : []),
        ...addedIngredients.map((option) => option.price),
      ]),
    };
  });
  const subtotal = sumUsd(
    lineDetails.map((line) =>
      calculateLineTotal(line.unitPrice, line.item.cartQty),
    ),
  );
  if (
    data.fulfillmentType === "pickup" &&
    ordering.pickupMinimumOrderUsd !== null &&
    subtotal.lessThan(ordering.pickupMinimumOrderUsd)
  ) {
    throw new Error(
      `The minimum pickup order is ${formatUsdForMessage(ordering.pickupMinimumOrderUsd)}.`,
    );
  }
  const [zone, requestedCoupon, exchangeRate] = await Promise.all([
    data.fulfillmentType === "delivery"
      ? prisma.deliveryZone.findUnique({
          where: { id: data.deliveryZoneId! },
        })
      : Promise.resolve(null),
    data.couponCode
      ? prisma.coupon.findUnique({
          where: { code: data.couponCode.toUpperCase() },
        })
      : Promise.resolve(null),
    getCurrentUsdToLbpRate(),
  ]);
  if (data.fulfillmentType === "delivery" && (!zone || !zone.isAvailable))
    throw new Error("This delivery area is not available.");
  if (zone && subtotal.lessThan(zone.minimumOrder))
    throw new Error(
      `The minimum order for ${zone.name} is ${formatUsdForMessage(zone.minimumOrder)}.`,
    );
  let coupon = null;
  let discountAmount = decimal(0);
  if (data.couponCode) {
    coupon = requestedCoupon;
    if (!coupon || !coupon.isActive)
      throw new Error("This coupon is invalid or inactive.");
    if (coupon.expiresAt && coupon.expiresAt <= new Date())
      throw new Error("This coupon has expired.");
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit)
      throw new Error("This coupon has reached its usage limit.");
    if (coupon.userId && coupon.userId !== user.id)
      throw new Error("This coupon is not assigned to your account.");
    if (subtotal.lessThan(coupon.minimumOrder))
      throw new Error(
        `This coupon requires a minimum order of ${formatUsdForMessage(coupon.minimumOrder)}.`,
      );
    const eligibleSubtotal = coupon.categoryId
      ? sumUsd(
          lineDetails
            .filter((line) => line.food.typeId === coupon!.categoryId)
            .map((line) =>
              calculateLineTotal(line.unitPrice, line.item.cartQty),
            ),
        )
      : subtotal;
    if (eligibleSubtotal.lessThanOrEqualTo(0))
      throw new Error("This coupon does not apply to any item in your cart.");
    discountAmount =
      coupon.discountType === "percentage"
        ? calculatePercentageDiscount(eligibleSubtotal, coupon.value)
        : calculateFixedDiscount(eligibleSubtotal, coupon.value);
  }
  const deliveryFee = zone?.deliveryFee ?? decimal(0);
  const total = calculateOrderTotal(subtotal, deliveryFee, discountAmount);
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const orderNumber = `ORD-${datePart}-${randomUUID().slice(0, 6).toUpperCase()}`;
  const estimatedMinutes =
    data.fulfillmentType === "delivery" ? zone?.estimatedMinutes || 45 : 20;
  const estimatedReadyAt = new Date(Date.now() + estimatedMinutes * 60_000);

  const requestedStock = Array.from(
    lineDetails
      .reduce(
        (items, line) => {
          const current = items.get(line.food.id);
          if (current) current.quantity += line.item.cartQty;
          else {
            items.set(line.food.id, {
              foodId: line.food.id,
              foodName: line.food.name,
              quantity: line.item.cartQty,
            });
          }
          return items;
        },
        new Map<
          string,
          { foodId: string; foodName: string; quantity: number }
        >(),
      )
      .values(),
  ).sort((first, second) => first.foodId.localeCompare(second.foodId));

  const completeCheckout = async () => {
    const duplicate = await findIdempotentOrder(
      user.id,
      data.checkoutRequestId,
      requestHash,
    );
    if (duplicate) return duplicate;

    try {
      const orderId = await prisma.$transaction(
        async (tx) => {
          const order = await tx.order.create({
            data: {
              orderNumber,
              checkoutRequestId: data.checkoutRequestId,
              checkoutRequestHash: requestHash,
              userId: user.id,
              subtotal,
              deliveryFee,
              discountAmount,
              total,
              status: "pending",
              stockReturned: false,
              customerName: data.customerName,
              customerPhone: data.customerPhone,
              fulfillmentType: data.fulfillmentType,
              paymentMethod:
                data.fulfillmentType === "delivery"
                  ? "Cash on Delivery"
                  : "Cash on Pickup",
              paymentCode: null,
              paymentStatus: "pending",
              customerAddress:
                data.fulfillmentType === "delivery"
                  ? data.customerAddress
                  : null,
              mapLocation:
                data.fulfillmentType === "delivery"
                  ? data.mapLocation || null
                  : null,
              orderNotes: data.orderNotes || null,
              estimatedReadyAt,
              deliveryZoneId: zone?.id || null,
              couponId: coupon?.id || null,
              couponCode: coupon?.code || null,
              exchangeRateUsed: exchangeRate,
            },
          });

          if (coupon) {
            const updatedCoupon = await tx.coupon.updateMany({
              where: {
                id: coupon.id,
                ...(coupon.usageLimit === null
                  ? {}
                  : { usedCount: { lt: coupon.usageLimit } }),
              },
              data: { usedCount: { increment: 1 } },
            });
            if (updatedCoupon.count !== 1) {
              throw new Error(
                "This coupon reached its usage limit while ordering.",
              );
            }
          }

          const stockRows = requestedStock.map((stock) => ({
            ...stock,
            movementId: randomUUID(),
          }));
          const values = Prisma.join(
            stockRows.map((stock) =>
              Prisma.sql`(${stock.movementId}, ${stock.foodId}, ${stock.quantity})`,
            ),
          );
          const updatedFoods = await tx.$queryRaw<
            Array<{ foodId: string; newQty: number }>
          >(Prisma.sql`
            WITH requested ("movementId", "foodId", "requestedQty") AS (
              VALUES ${values}
            ),
            locked AS MATERIALIZED (
              SELECT
                food."id" AS "foodId",
                food."qty" AS "previousQty",
                requested."movementId",
                requested."requestedQty"
              FROM "public"."Food" AS food
              INNER JOIN requested ON requested."foodId" = food."id"
              ORDER BY food."id"
              FOR UPDATE OF food
            ),
            updated AS (
              UPDATE "public"."Food" AS food
              SET "qty" = locked."previousQty" - locked."requestedQty"
              FROM locked
              WHERE food."id" = locked."foodId"
                AND locked."previousQty" >= locked."requestedQty"
              RETURNING food."id" AS "foodId", food."qty" AS "newQty"
            ),
            movements AS (
              INSERT INTO "public"."StockMovement" (
                "id",
                "foodId",
                "orderId",
                "change",
                "previousQty",
                "newQty",
                "reason",
                "createdAt"
              )
              SELECT
                requested."movementId",
                updated."foodId",
                ${order.id},
                -requested."requestedQty",
                updated."newQty" + requested."requestedQty",
                updated."newQty",
                'Order purchase',
                CURRENT_TIMESTAMP
              FROM updated
              INNER JOIN requested
                ON requested."foodId" = updated."foodId"
              RETURNING "foodId"
            )
            SELECT updated."foodId", updated."newQty"
            FROM updated
            INNER JOIN movements
              ON movements."foodId" = updated."foodId"
          `);

          if (updatedFoods.length !== requestedStock.length) {
            const updatedIds = new Set(updatedFoods.map((food) => food.foodId));
            const unavailable = requestedStock.find(
              (food) => !updatedIds.has(food.foodId),
            );
            throw new InsufficientStockError(
              unavailable?.foodName || "A selected item",
            );
          }

          await runtime.afterStockUpdate?.();

          await tx.orderItem.createMany({
            data: lineDetails.map(
              ({ item, food, unitPrice, removedIngredients, addedIngredients }) => ({
                orderId: order.id,
                foodId: food.id,
                foodName: food.name,
                quantity: item.cartQty,
                price: unitPrice,
                extraCheese: item.extraCheese,
                removedIngredients,
                addedIngredients,
                customizationNote: item.customizationNote || null,
              }),
            ),
          });

          return order.id;
        },
        { maxWait: 15_000, timeout: 30_000 },
      );

      const completedOrder = await prisma.order.findUniqueOrThrow({
        where: { id: orderId },
        include: checkoutOrderInclude,
      });
      addOperationalBreadcrumb("checkout.succeeded", {
        request: requestHash.slice(0, 12),
      });
      return completedOrder;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const existing = await findIdempotentOrder(
          user.id,
          data.checkoutRequestId,
          requestHash,
        );
        if (existing) return existing;
      }
      throw error;
    }
  };

  const completed = await withCheckoutRetry(completeCheckout, {
      onRetry(error, attempt) {
        console.warn("Retrying a transient checkout transaction.", {
          code: databaseErrorCode(error),
          databaseCode: databaseNativeErrorCode(error),
          attempt,
        });
        captureOperationalError(error, {
          operation: "checkout.transaction_retry",
          code: databaseErrorCode(error),
          requestHash,
          attempt,
        });
      },
  });
  return serializeForClient(completed);
  } catch (error) {
    if (
      error instanceof CheckoutRequestConflictError ||
      error instanceof InsufficientStockError
    ) {
      addOperationalBreadcrumb(
        error instanceof InsufficientStockError
          ? "checkout.insufficient_stock"
          : "checkout.idempotency_conflict",
        { request: requestHash.slice(0, 12) },
      );
      throw error;
    }
    if (isDatabaseError(error)) {
      console.error("Checkout database operation failed.", {
        code: databaseErrorCode(error),
        databaseCode: databaseNativeErrorCode(error),
      });
      captureOperationalError(error, {
        operation: "checkout.failed",
        code: databaseErrorCode(error),
        requestHash,
      });
      throw new Error(
        "We couldn't complete your order right now. Please try again.",
      );
    }
    throw error;
  }
}
