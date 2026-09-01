"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import {
  requireAdmin,
  requireRateLimitedAdmin,
  requireUser,
} from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";
import {
  foodIssueReasonSchema,
  foodIssueStatusSchema,
  idSchema,
  usdAmountSchema,
  validationMessage,
} from "@/lib/validation";
import { serializeForClient } from "@/lib/serialize";
import { reviewFoodIssueForAdmin } from "@/server/refundService";

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
  refundAmount: usdAmountSchema.min(0).max(100_000).optional(),
});

export async function submitFoodIssueReport(
  input: z.input<typeof submitIssueSchema>,
) {
  const user = await requireUser();
  await enforceRateLimit({
    policy: "food-issue-user",
    identifier: user.id,
    failurePolicy: "closed",
  });
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

  const report = await prisma.foodIssueReport.create({
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
  return serializeForClient(report);
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

  const sorted = reports.sort((first, second) => {
    if (first.status === second.status) return 0;
    if (first.status === "pending") return -1;
    if (second.status === "pending") return 1;
    return 0;
  });
  return serializeForClient(sorted);
}

export async function reviewFoodIssueReport(
  input: z.input<typeof reviewIssueSchema>,
) {
  const actor = await requireRateLimitedAdmin();
  const parsed = reviewIssueSchema.safeParse(input);
  if (!parsed.success) throw new Error(validationMessage(parsed.error));
  const data = parsed.data;

  const updatedReport = await reviewFoodIssueForAdmin(actor, data);
  return serializeForClient(updatedReport);
}
