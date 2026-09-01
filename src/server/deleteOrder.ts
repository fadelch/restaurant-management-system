"use server";

import prisma from "@/lib/prisma";
import { requireRateLimitedAdmin } from "@/lib/auth";
import { idSchema, validationMessage } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { serializeForClient } from "@/lib/serialize";

function normalizeStatus(status: string) {
  const value = status.trim().toLowerCase();

  if (value === "canceled") {
    return "cancelled";
  }

  return value;
}

export async function deleteOrder(id: string) {
  const actor = await requireRateLimitedAdmin();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) throw new Error(validationMessage(parsed.error));
  const validId = parsed.data;

  const archived = await prisma.$transaction(
    async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: validId },
        include: { items: true },
      });
      if (!order) throw new Error("Order not found.");
      const normalizedStatus = normalizeStatus(order.status);
      if (
        ["done", "completed"].includes(normalizedStatus) ||
        ["done", "refunded"].includes(order.paymentStatus.toLowerCase())
      ) {
        throw new Error(
          "Completed, paid, or refunded orders cannot be removed. Archive them from the finished-orders view.",
        );
      }
      const shouldReturnQty =
        normalizedStatus !== "cancelled" && !order.stockReturned;
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
              reason: "Order cancelled and archived - stock restored",
            },
          });
        }
      }
      const archived = await tx.order.update({
        where: { id: validId },
        data: {
          status: "cancelled",
          stockReturned: true,
          paymentStatus:
            order.paymentStatus === "pending"
              ? "cancelled"
              : order.paymentStatus,
          adminArchivedAt: new Date(),
        },
      });
      await writeAuditLog(
        actor,
        {
          action: "CANCEL_AND_ARCHIVE_ORDER",
          entityType: "Order",
          entityId: validId,
          changes: {
            orderNumber: order.orderNumber,
            before: {
              status: order.status,
              paymentStatus: order.paymentStatus,
              stockReturned: order.stockReturned,
            },
            after: {
              status: archived.status,
              paymentStatus: archived.paymentStatus,
              stockReturned: archived.stockReturned,
              adminArchivedAt: archived.adminArchivedAt,
            },
            total: order.total,
          },
        },
        tx,
      );
      return archived;
    },
    { isolationLevel: "Serializable" },
  );
  return serializeForClient(archived);
}
