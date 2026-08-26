"use server";

import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { adminOrderInclude } from "@/lib/prismaSelects";
import { idSchema, validationMessage } from "@/lib/validation";

export async function getOrderById(id: string) {
  await requireAdmin();
  try {
    const parsed = idSchema.safeParse(id);
    if (!parsed.success) throw new Error(validationMessage(parsed.error));

    return await prisma.order.findUnique({
      where: {
        id: parsed.data,
      },
      include: adminOrderInclude,
    });
  } catch (err) {
    console.log("Error fetching order:", err);
    throw err;
  }
}
