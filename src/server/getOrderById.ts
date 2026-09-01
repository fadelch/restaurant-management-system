"use server";

import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { adminOrderInclude } from "@/lib/prismaSelects";
import { idSchema, validationMessage } from "@/lib/validation";
import { serializeForClient } from "@/lib/serialize";

export async function getOrderById(id: string) {
  await requireAdmin();
  try {
    const parsed = idSchema.safeParse(id);
    if (!parsed.success) throw new Error(validationMessage(parsed.error));

    const order = await prisma.order.findUnique({
      where: {
        id: parsed.data,
      },
      include: adminOrderInclude,
    });
    return serializeForClient(order);
  } catch (err) {
    console.log("Error fetching order:", err);
    throw err;
  }
}
