import type { Prisma } from "@/generated/prisma";
import type { z } from "zod";
import type {
  orderStatusSchema,
  paymentStatusSchema,
} from "@/lib/validation";

export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export type CustomerOrder = Prisma.OrderGetPayload<{
  include: {
    user: { select: { id: true; name: true; email: true } };
    items: {
      include: {
        food: { include: { type: true } };
        issueReports: true;
      };
    };
  };
}>;

export type AdminOrder = Prisma.OrderGetPayload<{
  include: {
    user: { select: { id: true; name: true; email: true } };
    items: { include: { food: true } };
  };
}>;

export type FoodIssueReportItem =
  Prisma.FoodIssueReportGetPayload<Record<string, never>>;
