"use server";

import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { idSchema, validationMessage } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";

function normalizeStatus(status: string) {
  const value = status.trim().toLowerCase();

  if (value === "canceled") {
    return "cancelled";
  }

  return value;
}

export async function deleteOrder(id: string) {
  try {
    const actor = await requireAdmin();
    const parsed = idSchema.safeParse(id);
    if (!parsed.success) throw new Error(validationMessage(parsed.error));
    id = parsed.data;

    const order = await prisma.order.findUnique({
      where: {
        id,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new Error("Order not found.");
    }

    const status = normalizeStatus(order.status);

    const shouldReturnQty =
      status !== "cancelled" && order.stockReturned === false;

    return await prisma
      .$transaction(async (tx) => {
        if (shouldReturnQty) {
          for (const item of order.items) {
            const food = await tx.food.findUnique({
              where: { id: item.foodId },
            });
            if (!food) continue;
            await tx.food.update({
              where: {
                id: item.foodId,
              },
              data: {
                qty: {
                  increment: item.quantity,
                },
              },
            });
            await tx.stockMovement.create({
              data: {
                foodId: item.foodId,
                adminId: actor.id,
                orderId: id,
                change: item.quantity,
                previousQty: food.qty,
                newQty: food.qty + item.quantity,
                reason: "Order deleted - stock restored",
              },
            });
          }
        }

        return await tx.order.delete({
          where: {
            id,
          },
        });
      })
      .then(async (deleted) => {
        await writeAuditLog(actor, {
          action: "DELETE_ORDER",
          entityType: "Order",
          entityId: id,
          changes: {
            orderNumber: order.orderNumber,
            status: order.status,
            total: order.total,
          },
        });
        return deleted;
      });
  } catch (err) {
    console.log("Error deleting order:", err);
    throw err;
  }
}
