"use server";

import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  idSchema,
  orderStatusSchema,
  validationMessage,
} from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";

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
  try {
    const actor = await requireAdmin();
    const idResult = idSchema.safeParse(data.id);
    if (!idResult.success) throw new Error(validationMessage(idResult.error));
    const id = idResult.data;
    const newStatus = normalizeStatus(data.status);
    const statusResult = orderStatusSchema.safeParse(newStatus);
    if (!statusResult.success)
      throw new Error(validationMessage(statusResult.error));

    const existingOrder = await prisma.order.findUnique({
      where: {
        id,
      },
      include: {
        items: true,
      },
    });

    if (!existingOrder) {
      throw new Error("Order not found.");
    }

    const oldStatus = normalizeStatus(existingOrder.status);

    const shouldReturnQty =
      newStatus === "cancelled" && existingOrder.stockReturned === false;

    const shouldTakeQtyAgain =
      oldStatus === "cancelled" &&
      newStatus !== "cancelled" &&
      existingOrder.stockReturned === true;

    const updatedOrder = await prisma.$transaction(async (tx) => {
      if (shouldReturnQty) {
        for (const item of existingOrder.items) {
          const food = await tx.food.findUnique({ where: { id: item.foodId } });
          if (!food) throw new Error("Food item not found.");
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
              reason: "Order cancelled - stock restored",
            },
          });
        }
      }

      if (shouldTakeQtyAgain) {
        for (const item of existingOrder.items) {
          const food = await tx.food.findUnique({
            where: {
              id: item.foodId,
            },
          });

          if (!food) {
            throw new Error("Food item not found.");
          }

          if (food.qty < item.quantity) {
            throw new Error(
              `${food.name} does not have enough quantity to reactivate this order.`,
            );
          }

          await tx.food.update({
            where: {
              id: item.foodId,
            },
            data: {
              qty: {
                decrement: item.quantity,
              },
            },
          });
          await tx.stockMovement.create({
            data: {
              foodId: item.foodId,
              adminId: actor.id,
              orderId: id,
              change: -item.quantity,
              previousQty: food.qty,
              newQty: food.qty - item.quantity,
              reason: "Cancelled order reactivated",
            },
          });
        }
      }

      return await tx.order.update({
        where: {
          id,
        },
        data: {
          status: newStatus,
          paymentStatus:
            existingOrder.paymentStatus === "refunded"
              ? "refunded"
              : newStatus === "cancelled"
                ? "cancelled"
                : newStatus === "done"
                  ? "done"
                  : oldStatus === "cancelled" && newStatus !== "cancelled"
                    ? "pending"
                    : existingOrder.paymentStatus,
          stockReturned:
            newStatus === "cancelled"
              ? true
              : shouldTakeQtyAgain
                ? false
                : existingOrder.stockReturned,
        },
        include: {
          user: true,
          items: {
            include: {
              food: true,
            },
          },
        },
      });
    });

    await writeAuditLog(actor, {
      action: "UPDATE_ORDER_STATUS",
      entityType: "Order",
      entityId: id,
      changes: {
        before: {
          status: oldStatus,
          paymentStatus: existingOrder.paymentStatus,
        },
        after: {
          status: newStatus,
          paymentStatus: updatedOrder.paymentStatus,
        },
      },
    });

    return updatedOrder;
  } catch (err) {
    console.log("Error updating order status:", err);
    throw err;
  }
}
