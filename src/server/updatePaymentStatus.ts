"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  idSchema,
  paymentStatusSchema,
  validationMessage,
} from "@/lib/validation";

const updatePaymentSchema = z.object({
  id: idSchema,
  paymentStatus: paymentStatusSchema,
});

export async function updatePaymentStatus(
  input: z.input<typeof updatePaymentSchema>,
) {
  const actor = await requireAdmin();
  const parsed = updatePaymentSchema.safeParse(input);
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  return prisma.$transaction(async (tx) => {
    const existingOrder = await tx.order.findUnique({
      where: { id: parsed.data.id },
    });
    if (!existingOrder) throw new Error("Order not found.");
    const refundedAmount =
      parsed.data.paymentStatus === "refunded"
        ? existingOrder.refundedAmount || existingOrder.total
        : existingOrder.refundedAmount;
    const updated = await tx.order.update({
      where: { id: existingOrder.id },
      data: { paymentStatus: parsed.data.paymentStatus, refundedAmount },
    });
    await writeAuditLog(
      actor,
      {
        action: "UPDATE_PAYMENT_STATUS",
        entityType: "Order",
        entityId: existingOrder.id,
        changes: {
          before: {
            paymentStatus: existingOrder.paymentStatus,
            refundedAmount: existingOrder.refundedAmount,
          },
          after: {
            paymentStatus: updated.paymentStatus,
            refundedAmount: updated.refundedAmount,
          },
        },
      },
      tx,
    );
    return updated;
  });
}
