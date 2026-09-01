import type { Prisma } from "@/generated/prisma";
import type { z } from "zod";
import type {
  orderStatusSchema,
  paymentStatusSchema,
} from "@/lib/validation";
import type { Serialized } from "@/lib/serialize";

export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export type CustomerOrder = Serialized<
  Prisma.OrderGetPayload<{
    include: {
      user: { select: { id: true; name: true; email: true } };
      items: {
        include: {
          food: { include: { type: true } };
          issueReports: true;
        };
      };
    };
  }>
>;

export type AdminOrder = Serialized<
  Prisma.OrderGetPayload<{
    include: {
      user: { select: { id: true; name: true; email: true } };
      items: { include: { food: true } };
    };
  }>
>;

export type FoodIssueReportItem = Serialized<
  Prisma.FoodIssueReportGetPayload<Record<string, never>>
>;
