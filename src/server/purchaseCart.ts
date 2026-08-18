"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getRestaurantStatus } from "@/lib/restaurantHours";
import { idSchema, validationMessage } from "@/lib/validation";
import { normalizeOptionalIngredients } from "@/lib/foodOptions";

const purchaseSchema = z.object({
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

export async function purchaseCart(input: z.input<typeof purchaseSchema>) {
  const user = await requireUser();
  const parsed = purchaseSchema.safeParse(input);
  if (!parsed.success) throw new Error(validationMessage(parsed.error));
  const data = parsed.data;
  const restaurant = await getRestaurantStatus();
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
  const lineDetails = data.items.map((item) => {
    const food = foods.find((entry) => entry.id === item.id);
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
      unitPrice:
        food.price +
        (item.extraCheese ? food.extraCheesePrice : 0) +
        addedIngredients.reduce((total, option) => total + option.price, 0),
    };
  });
  const subtotal = lineDetails.reduce(
    (sum, line) => sum + line.unitPrice * line.item.cartQty,
    0,
  );
  const zone =
    data.fulfillmentType === "delivery"
      ? await prisma.deliveryZone.findUnique({
          where: { id: data.deliveryZoneId! },
        })
      : null;
  if (data.fulfillmentType === "delivery" && (!zone || !zone.isAvailable))
    throw new Error("This delivery area is not available.");
  if (zone && subtotal < zone.minimumOrder)
    throw new Error(
      `The minimum order for ${zone.name} is $${zone.minimumOrder.toFixed(2)}.`,
    );
  let coupon = null;
  let discountAmount = 0;
  if (data.couponCode) {
    coupon = await prisma.coupon.findUnique({
      where: { code: data.couponCode.toUpperCase() },
    });
    if (!coupon || !coupon.isActive)
      throw new Error("This coupon is invalid or inactive.");
    if (coupon.expiresAt && coupon.expiresAt <= new Date())
      throw new Error("This coupon has expired.");
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit)
      throw new Error("This coupon has reached its usage limit.");
    if (coupon.userId && coupon.userId !== user.id)
      throw new Error("This coupon is not assigned to your account.");
    if (subtotal < coupon.minimumOrder)
      throw new Error(
        `This coupon requires a minimum order of $${coupon.minimumOrder.toFixed(2)}.`,
      );
    const eligibleSubtotal = coupon.categoryId
      ? lineDetails.reduce(
          (sum, line) =>
            sum +
            (line.food.typeId === coupon!.categoryId
              ? line.unitPrice * line.item.cartQty
              : 0),
          0,
        )
      : subtotal;
    if (eligibleSubtotal <= 0)
      throw new Error("This coupon does not apply to any item in your cart.");
    discountAmount =
      coupon.discountType === "percentage"
        ? eligibleSubtotal * (coupon.value / 100)
        : Math.min(coupon.value, eligibleSubtotal);
  }
  const deliveryFee = zone?.deliveryFee || 0;
  const total = Math.max(0, subtotal + deliveryFee - discountAmount);
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const orderNumber = `ORD-${datePart}-${randomUUID().slice(0, 6).toUpperCase()}`;
  const estimatedMinutes =
    data.fulfillmentType === "delivery" ? zone?.estimatedMinutes || 45 : 20;
  const estimatedReadyAt = new Date(Date.now() + estimatedMinutes * 60_000);

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNumber,
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
        paymentMethod: "Pay on Delivery",
        paymentCode: null,
        paymentStatus: "pending",
        customerAddress:
          data.fulfillmentType === "delivery" ? data.customerAddress : null,
        mapLocation:
          data.fulfillmentType === "delivery" ? data.mapLocation || null : null,
        orderNotes: data.orderNotes || null,
        estimatedReadyAt,
        deliveryZoneId: zone?.id || null,
        couponId: coupon?.id || null,
        couponCode: coupon?.code || null,
      },
    });
    for (const line of lineDetails) {
      const { item, food, unitPrice, removedIngredients, addedIngredients } =
        line;
      const updated = await tx.food.updateMany({
        where: { id: food.id, qty: { gte: item.cartQty } },
        data: { qty: { decrement: item.cartQty } },
      });
      if (updated.count !== 1)
        throw new Error(`${food.name} no longer has enough stock.`);
      const latest = await tx.food.findUniqueOrThrow({
        where: { id: food.id },
        select: { qty: true },
      });
      await tx.orderItem.create({
        data: {
          orderId: order.id,
          foodId: food.id,
          quantity: item.cartQty,
          price: unitPrice,
          extraCheese: item.extraCheese,
          removedIngredients,
          addedIngredients,
          customizationNote: item.customizationNote || null,
        },
      });
      await tx.stockMovement.create({
        data: {
          foodId: food.id,
          orderId: order.id,
          change: -item.cartQty,
          previousQty: latest.qty + item.cartQty,
          newQty: latest.qty,
          reason: "Order purchase",
        },
      });
    }
    if (coupon) {
      const updated = await tx.coupon.updateMany({
        where: {
          id: coupon.id,
          ...(coupon.usageLimit === null
            ? {}
            : { usedCount: { lt: coupon.usageLimit } }),
        },
        data: { usedCount: { increment: 1 } },
      });
      if (updated.count !== 1)
        throw new Error("This coupon reached its usage limit while ordering.");
    }
    return tx.order.findUniqueOrThrow({
      where: { id: order.id },
      include: {
        user: true,
        items: { include: { food: true } },
        deliveryZone: true,
      },
    });
  });
}
