"use server";

import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function getOrderById(id: string) {
  await requireAdmin();
  try {
    if (!id) {
      throw new Error("Order ID is required.");
    }

    return await prisma.order.findUnique({
      where: {
        id,
      },
      include: {
        user: true,
        items: {
          include: {
            food: true,
          },
        },
      },
    });
  } catch (err) {
    console.log("Error fetching order:", err);
    throw err;
  }
}
