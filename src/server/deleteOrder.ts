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
  const actor = await requireAdmin();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) throw new Error(validationMessage(parsed.error));
  const validId = parsed.data;

  return prisma.$transaction(
    async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: validId },
        include: { items: true },
      });
      if (!order) throw new Error("Order not found.");
      const shouldReturnQty =
        normalizeStatus(order.status) !== "cancelled" && !order.stockReturned;
      if (shouldReturnQty) {
        const quantities = new Map<string, number>();
        order.items.forEach((item) => {
          quantities.set(
            item.foodId,
            (quantities.get(item.foodId) || 0) + item.quantity,
          );
        });
        const foods = await tx.food.findMany({
          where: { id: { in: [...quantities.keys()] } },
        });
        for (const food of foods) {
          const quantity = quantities.get(food.id) || 0;
          await tx.food.update({
            where: { id: food.id },
            data: { qty: { increment: quantity } },
          });
          await tx.stockMovement.create({
            data: {
              foodId: food.id,
              adminId: actor.id,
              orderId: validId,
              change: quantity,
              previousQty: food.qty,
              newQty: food.qty + quantity,
              reason: "Order deleted - stock restored",
            },
          });
        }
      }
      const deleted = await tx.order.delete({ where: { id: validId } });
      await writeAuditLog(
        actor,
        {
          action: "DELETE_ORDER",
          entityType: "Order",
          entityId: validId,
          changes: {
            orderNumber: order.orderNumber,
            status: order.status,
            total: order.total,
          },
        },
        tx,
      );
      return deleted;
    },
    { isolationLevel: "Serializable" },
  );
}
