"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  foodIssueReasonSchema,
  foodIssueStatusSchema,
  idSchema,
  validationMessage,
} from "@/lib/validation";

const submitIssueSchema = z.object({
  orderId: idSchema,
  orderItemId: z.coerce.number().int().positive(),
  reason: foodIssueReasonSchema,
  details: z
    .string()
    .trim()
    .min(10, "Please explain the food problem in at least 10 characters.")
    .max(500),
  quantity: z.coerce.number().int().positive().max(1000),
});

const reviewIssueSchema = z.object({
  id: idSchema,
  status: foodIssueStatusSchema.exclude(["pending"]),
  refundAmount: z.coerce.number().min(0).max(100_000).optional(),
});

export async function submitFoodIssueReport(
  input: z.input<typeof submitIssueSchema>,
) {
  const user = await requireUser();
  const parsed = submitIssueSchema.safeParse(input);
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  const data = parsed.data;
  const orderItem = await prisma.orderItem.findUnique({
    where: { id: data.orderItemId },
    include: { order: true, food: true },
  });

  if (
    !orderItem ||
    orderItem.orderId !== data.orderId ||
    orderItem.order.userId !== user.id
  ) {
    throw new Error("This order item was not found in your account.");
  }

  const orderStatus = orderItem.order.status.trim().toLowerCase();
  if (orderStatus !== "done" && orderStatus !== "completed") {
    throw new Error(
      "Food problems can be reported after the order is marked as done.",
    );
  }

  if (data.quantity > orderItem.quantity) {
    throw new Error(
      `You can report at most ${orderItem.quantity} item(s) for this food.`,
    );
  }

  const existingReport = await prisma.foodIssueReport.findFirst({
    where: {
      orderItemId: orderItem.id,
      userId: user.id,
      status: { in: ["pending", "approved"] },
    },
  });
  if (existingReport) {
    throw new Error(
      "A pending or approved report already exists for this food item.",
    );
  }

  return prisma.foodIssueReport.create({
    data: {
      orderId: orderItem.orderId,
      orderItemId: orderItem.id,
      userId: user.id,
      reason: data.reason,
      details: data.details,
      quantity: data.quantity,
    },
    include: { orderItem: { include: { food: true } } },
  });
}

export async function getFoodIssueReportsForAdmin() {
  await requireAdmin();
  const reports = await prisma.foodIssueReport.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      order: {
        select: {
          id: true,
          orderNumber: true,
          paymentStatus: true,
          refundedAmount: true,
          total: true,
        },
      },
      orderItem: { include: { food: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return reports.sort((first, second) => {
    if (first.status === second.status) return 0;
    if (first.status === "pending") return -1;
    if (second.status === "pending") return 1;
    return 0;
  });
}

export async function reviewFoodIssueReport(
  input: z.input<typeof reviewIssueSchema>,
) {
  const actor = await requireAdmin();
  const parsed = reviewIssueSchema.safeParse(input);
  if (!parsed.success) throw new Error(validationMessage(parsed.error));
  const data = parsed.data;

  const report = await prisma.foodIssueReport.findUnique({
    where: { id: data.id },
    include: { order: true, orderItem: { include: { food: true } } },
  });
  if (!report) throw new Error("Food issue report was not found.");
  if (report.status !== "pending") {
    throw new Error("This food issue report has already been reviewed.");
  }

  const maximumRefund = Math.min(
    report.order.total,
    report.orderItem.price * report.quantity,
  );
  const refundAmount =
    data.status === "approved"
      ? Math.round((data.refundAmount ?? maximumRefund) * 100) / 100
      : 0;
  if (refundAmount > maximumRefund) {
    throw new Error(
      `The refund cannot exceed $${maximumRefund.toFixed(2)} for the reported quantity.`,
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const issue = await tx.foodIssueReport.update({
      where: { id: report.id },
      data: {
        status: data.status,
        refundAmount,
        resolvedAt: new Date(),
      },
      include: { orderItem: { include: { food: true } } },
    });

    if (data.status === "approved") {
      await tx.order.update({
        where: { id: report.orderId },
        data: {
          paymentStatus: "refunded",
          refundedAmount: Math.min(
            report.order.total,
            report.order.refundedAmount + refundAmount,
          ),
        },
      });
    }

    return issue;
  });

  await writeAuditLog(actor, {
    action: "REVIEW_FOOD_ISSUE",
    entityType: "FoodIssueReport",
    entityId: report.id,
    changes: {
      before: { status: report.status, refundAmount: report.refundAmount },
      after: { status: data.status, refundAmount },
      food: report.orderItem.food.name,
      reason: report.reason,
    },
  });

  return updated;
}
