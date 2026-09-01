"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireRateLimitedAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  idSchema,
  paymentStatusSchema,
  validationMessage,
} from "@/lib/validation";
import { roundUsd } from "@/lib/money";
import { serializeForClient } from "@/lib/serialize";

const updatePaymentSchema = z.object({
  id: idSchema,
  paymentStatus: paymentStatusSchema,
});

export async function updatePaymentStatus(
  input: z.input<typeof updatePaymentSchema>,
) {
  const actor = await requireRateLimitedAdmin();
  const parsed = updatePaymentSchema.safeParse(input);
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const lockedOrder = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "public"."Order"
      WHERE "id" = ${parsed.data.id}
      FOR UPDATE
    `;
    if (!lockedOrder.length) throw new Error("Order not found.");
    const existingOrder = await tx.order.findUnique({
      where: { id: parsed.data.id },
    });
    if (!existingOrder) throw new Error("Order not found.");
    const refundedAmount =
      parsed.data.paymentStatus === "refunded"
        ? roundUsd(existingOrder.total)
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
  return serializeForClient(updatedOrder);
}
