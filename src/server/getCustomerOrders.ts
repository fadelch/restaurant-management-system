"use server";

import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { idSchema, validationMessage } from "@/lib/validation";
import { customerOrderInclude } from "@/lib/prismaSelects";

export async function getCustomerOrders(userEmail: string) {
  void userEmail;
  const user = await requireUser();

  return prisma.order.findMany({
    where: {
      userId: user.id,
    },
    include: customerOrderInclude(user.id),
    orderBy: { createdAt: "desc" },
  });
}

export async function getCustomerOrderById(orderId: string, userEmail: string) {
  void userEmail;
  const user = await requireUser();
  const parsed = idSchema.safeParse(orderId);
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  return prisma.order.findFirst({
    where: {
      id: parsed.data,
      userId: user.id,
    },
    include: customerOrderInclude(user.id),
  });
}
