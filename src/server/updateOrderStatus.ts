"use server";

import prisma from "@/lib/prisma";
import { requireRateLimitedAdmin } from "@/lib/auth";
import {
  idSchema,
  orderStatusSchema,
  validationMessage,
} from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { adminOrderInclude } from "@/lib/prismaSelects";
import { serializeForClient } from "@/lib/serialize";

function normalizeStatus(status: string) {
  const value = status.trim().toLowerCase();

  if (value === "canceled") {
    return "cancelled";
  }

  if (value === "completed") {
    return "done";
  }

  return value;
}

export async function updateOrderStatus(data: { id: string; status: string }) {
  const actor = await requireRateLimitedAdmin();
  const idResult = idSchema.safeParse(data.id);
  if (!idResult.success) throw new Error(validationMessage(idResult.error));
  const id = idResult.data;
  const newStatus = normalizeStatus(data.status);
  const statusResult = orderStatusSchema.safeParse(newStatus);
  if (!statusResult.success)
    throw new Error(validationMessage(statusResult.error));

  const order = await prisma.$transaction(
    async (tx) => {
      const existingOrder = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!existingOrder) throw new Error("Order not found.");

      const oldStatus = normalizeStatus(existingOrder.status);
      const shouldReturnQty =
        newStatus === "cancelled" && !existingOrder.stockReturned;
      const shouldTakeQtyAgain =
        oldStatus === "cancelled" &&
        newStatus !== "cancelled" &&
        existingOrder.stockReturned;
      const quantities = new Map<string, number>();
      existingOrder.items.forEach((item) => {
        quantities.set(
          item.foodId,
          (quantities.get(item.foodId) || 0) + item.quantity,
        );
      });
      const foods =
        shouldReturnQty || shouldTakeQtyAgain
          ? await tx.food.findMany({
              where: { id: { in: [...quantities.keys()] } },
            })
          : [];
      if (
        (shouldReturnQty || shouldTakeQtyAgain) &&
        foods.length !== quantities.size
      ) {
        throw new Error("Food item not found.");
      }

      for (const food of foods) {
        const quantity = quantities.get(food.id) || 0;
        if (shouldReturnQty) {
          await tx.food.update({
            where: { id: food.id },
            data: { qty: { increment: quantity } },
          });
          await tx.stockMovement.create({
            data: {
              foodId: food.id,
              adminId: actor.id,
              orderId: id,
              change: quantity,
              previousQty: food.qty,
              newQty: food.qty + quantity,
              reason: "Order cancelled - stock restored",
            },
          });
        } else if (shouldTakeQtyAgain) {
          const result = await tx.food.updateMany({
            where: { id: food.id, qty: { gte: quantity } },
            data: { qty: { decrement: quantity } },
          });
          if (result.count !== 1) {
            throw new Error(
              `${food.name} does not have enough quantity to reactivate this order.`,
            );
          }
          await tx.stockMovement.create({
            data: {
              foodId: food.id,
              adminId: actor.id,
              orderId: id,
              change: -quantity,
              previousQty: food.qty,
              newQty: food.qty - quantity,
              reason: "Cancelled order reactivated",
            },
          });
        }
      }

      const paymentStatus =
        existingOrder.paymentStatus === "refunded"
          ? "refunded"
          : newStatus === "cancelled"
            ? "cancelled"
            : newStatus === "done"
              ? "done"
              : oldStatus === "cancelled"
                ? "pending"
                : existingOrder.paymentStatus;
      const stateUpdate = await tx.order.updateMany({
        where: {
          id,
          status: existingOrder.status,
          stockReturned: existingOrder.stockReturned,
        },
        data: {
          status: newStatus,
          paymentStatus,
          stockReturned:
            newStatus === "cancelled"
              ? true
              : shouldTakeQtyAgain
                ? false
                : existingOrder.stockReturned,
        },
      });
      if (stateUpdate.count !== 1) {
        throw new Error("Order status changed while this update was running.");
      }
      const updatedOrder = await tx.order.findUniqueOrThrow({
        where: { id },
        include: adminOrderInclude,
      });
      await writeAuditLog(
        actor,
        {
          action: "UPDATE_ORDER_STATUS",
          entityType: "Order",
          entityId: id,
          changes: {
            before: {
              status: oldStatus,
              paymentStatus: existingOrder.paymentStatus,
            },
            after: { status: newStatus, paymentStatus },
          },
        },
        tx,
      );
      return updatedOrder;
    },
    { isolationLevel: "Serializable" },
  );
  return serializeForClient(order);
}
