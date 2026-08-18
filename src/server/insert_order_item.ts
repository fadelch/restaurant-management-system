"use server";

import prisma from "@/lib/prisma";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { idSchema, validationMessage } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  orderId: idSchema,
  foodId: idSchema,
  quantity: z.coerce.number().int().positive().max(1000),
  price: z.coerce.number().positive().max(100_000).optional(),
});

export async function insert_order_item(data: {
  orderId: string;
  foodId: string;
  quantity: number;
  price?: number;
}) {
  try {
    const actor = await requireAdmin();
    const parsed = schema.safeParse(data);
    if (!parsed.success) throw new Error(validationMessage(parsed.error));
    const { orderId, foodId, quantity } = parsed.data;

    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
    });

    if (!order) {
      throw new Error("Selected order does not exist.");
    }

    const food = await prisma.food.findUnique({
      where: {
        id: foodId,
      },
    });

    if (!food) {
      throw new Error("Selected food does not exist.");
    }

    if (food.qty < quantity) {
      throw new Error("Not enough food quantity in stock.");
    }

    const price = parsed.data.price || food.price;
    const itemTotal = price * quantity;

    const result = await prisma.$transaction(async (tx) => {
      const orderItem = await tx.orderItem.create({
        data: {
          orderId,
          foodId,
          quantity,
          price,
        },
        include: {
          order: true,
          food: true,
        },
      });

      await tx.food.update({
        where: {
          id: foodId,
        },
        data: {
          qty: {
            decrement: quantity,
          },
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
          previousQty: food.qty,
          newQty: food.qty - quantity,
          reason: "Admin added order item",
        },
      });

      return orderItem;
    });

    await writeAuditLog(actor, {
      action: "CREATE_ORDER_ITEM",
      entityType: "OrderItem",
      entityId: String(result.id),
      changes: { orderId, foodId, quantity, price },
    });
    return result;
  } catch (err) {
    console.log("Error inserting order item:", err);
    throw err;
  }
}
