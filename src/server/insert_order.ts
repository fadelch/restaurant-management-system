"use server";

import prisma from "@/lib/prisma";
import { requireRateLimitedAdmin } from "@/lib/auth";
import {
  idSchema,
  orderStatusSchema,
  validationMessage,
} from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { publicUserSelect } from "@/lib/prismaSelects";
import { getCurrentUsdToLbpRate } from "@/lib/currencySettings";
import { serializeForClient } from "@/lib/serialize";

export async function insert_order(data: { userId: string; status: string }) {
  try {
    const actor = await requireRateLimitedAdmin();
    const idResult = idSchema.safeParse(data.userId);
    if (!idResult.success) throw new Error(validationMessage(idResult.error));
    const userId = idResult.data;
    const statusResult = orderStatusSchema.safeParse(
      (data.status.trim() || "pending").toLowerCase(),
    );
    if (!statusResult.success)
      throw new Error(validationMessage(statusResult.error));
    const status = statusResult.data;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user || user.deletedAt) {
      throw new Error("Selected user does not exist.");
    }

    const exchangeRateUsed = await getCurrentUsdToLbpRate();
    const order = await prisma.order.create({
      data: {
        userId,
        customerName: user.name,
        status,
        total: 0,
        exchangeRateUsed,
        paymentMethod: "Cash on Delivery",
        paymentStatus:
          status === "done"
            ? "done"
            : status === "cancelled"
              ? "cancelled"
              : "pending",
      },
      include: {
        user: { select: publicUserSelect },
        items: true,
      },
    });
    await writeAuditLog(actor, {
      action: "CREATE_ORDER",
      entityType: "Order",
      entityId: order.id,
      changes: { userId, status },
    });
    return serializeForClient(order);
  } catch (err) {
    console.log("Error inserting order:", err);
    throw err;
  }
}
