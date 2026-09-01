import "server-only";

import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import {
  calculateRefundLimit,
  decimal,
  formatUsdForMessage,
  roundUsd,
} from "@/lib/money";

type AdminActor = { id: string; email: string | null };

export async function reviewFoodIssueForAdmin(
  actor: AdminActor,
  data: {
    id: string;
    status: "approved" | "rejected";
    refundAmount?: number;
  },
) {
  return prisma.$transaction(
    async (tx) => {
      // All refund paths lock the order row first. Decisions for separate issue
      // reports on the same order therefore use the latest refunded balance.
      const lockedOrder = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT orders."id"
        FROM "public"."FoodIssueReport" AS reports
        INNER JOIN "public"."Order" AS orders
          ON orders."id" = reports."orderId"
        WHERE reports."id" = ${data.id}
        FOR UPDATE OF orders
      `;
      if (!lockedOrder.length) {
        throw new Error("Food issue report was not found.");
      }

      const report = await tx.foodIssueReport.findUnique({
        where: { id: data.id },
        include: { order: true, orderItem: { include: { food: true } } },
      });
      if (!report) throw new Error("Food issue report was not found.");
      if (report.status !== "pending") {
        throw new Error("This food issue report has already been reviewed.");
      }

      const maximumRefund = calculateRefundLimit({
        orderTotal: report.order.total,
        alreadyRefunded: report.order.refundedAmount,
        unitPrice: report.orderItem.price,
        quantity: report.quantity,
      });
      const refundAmount =
        data.status === "approved"
          ? roundUsd(data.refundAmount ?? maximumRefund)
          : decimal(0);
      if (refundAmount.greaterThan(maximumRefund)) {
        throw new Error(
          `The refund cannot exceed ${formatUsdForMessage(maximumRefund)} for the reported quantity and remaining order balance.`,
        );
      }
      if (data.status === "approved" && !maximumRefund.greaterThan(0)) {
        throw new Error("This order has no remaining refundable balance.");
      }

      const claimed = await tx.foodIssueReport.updateMany({
        where: { id: report.id, status: "pending" },
        data: {
          status: data.status,
          refundAmount,
          resolvedAt: new Date(),
        },
      });
      if (claimed.count !== 1) {
        throw new Error("This food issue report has already been reviewed.");
      }

      if (data.status === "approved") {
        await tx.order.update({
          where: { id: report.orderId },
          data: {
            paymentStatus: "refunded",
            refundedAmount: roundUsd(
              report.order.refundedAmount.plus(refundAmount),
            ),
          },
        });
      }

      const updated = await tx.foodIssueReport.findUniqueOrThrow({
        where: { id: report.id },
        include: { orderItem: { include: { food: true } } },
      });
      await writeAuditLog(
        actor,
        {
          action: "REVIEW_FOOD_ISSUE",
          entityType: "FoodIssueReport",
          entityId: report.id,
          changes: {
            before: {
              status: report.status,
              refundAmount: report.refundAmount,
            },
            after: { status: data.status, refundAmount },
            food: report.orderItem.foodName,
            reason: report.reason,
          },
        },
        tx,
      );
      return updated;
    },
    { isolationLevel: "ReadCommitted" },
  );
}
