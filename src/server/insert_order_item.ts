"use server";

import prisma from "@/lib/prisma";
import { z } from "zod";
import { requireRateLimitedAdmin } from "@/lib/auth";
import { idSchema, validationMessage } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { calculateLineTotal } from "@/lib/money";
import { serializeForClient } from "@/lib/serialize";

const schema = z.object({
  orderId: idSchema,
  foodId: idSchema,
  quantity: z.coerce.number().int().positive().max(1000),
});

export async function insert_order_item(data: {
  orderId: string;
  foodId: string;
  quantity: number;
}) {
  try {
    const actor = await requireRateLimitedAdmin();
    const parsed = schema.safeParse(data);
    if (!parsed.success) throw new Error(validationMessage(parsed.error));
    const { orderId, foodId, quantity } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const [order, food] = await Promise.all([
        tx.order.findUnique({ where: { id: orderId } }),
        tx.food.findUnique({ where: { id: foodId } }),
      ]);
      if (!order) throw new Error("Selected order does not exist.");
      if (!food) throw new Error("Selected food does not exist.");
      if (["cancelled", "canceled"].includes(order.status.toLowerCase())) {
        throw new Error("Items cannot be added to a cancelled order.");
      }

      const stockUpdate = await tx.food.updateMany({
        where: { id: foodId, qty: { gte: quantity } },
        data: { qty: { decrement: quantity } },
      });
      if (stockUpdate.count !== 1) {
        throw new Error("Not enough food quantity in stock.");
      }
      const latestFood = await tx.food.findUniqueOrThrow({
        where: { id: foodId },
        select: { qty: true },
      });
      const price = food.price;
      const itemTotal = calculateLineTotal(price, quantity);
      const orderItem = await tx.orderItem.create({
        data: {
          orderId,
          foodId,
          foodName: food.name,
          quantity,
          price,
        },
        include: {
          order: true,
          food: true,
        },
      });

      await tx.order.update({
        where: {
          id: orderId,
        },
        data: {
          total: {
            increment: itemTotal,
          },
          subtotal: {
            increment: itemTotal,
          },
        },
      });

      await tx.stockMovement.create({
        data: {
          foodId,
          adminId: actor.id,
          orderId,
          change: -quantity,
          previousQty: latestFood.qty + quantity,
          newQty: latestFood.qty,
          reason: "Admin added order item",
        },
      });

      await writeAuditLog(
        actor,
        {
          action: "CREATE_ORDER_ITEM",
          entityType: "OrderItem",
          entityId: String(orderItem.id),
          changes: { orderId, foodId, quantity, price },
        },
        tx,
      );

      return orderItem;
    });
    return serializeForClient(result);
  } catch (err) {
    console.log("Error inserting order item:", err);
    throw err;
  }
}
