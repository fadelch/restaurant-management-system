"use server";

import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { serializeForClient } from "@/lib/serialize";

export async function getOrderItems() {
  await requireAdmin();
  try {
    const items = await prisma.orderItem.findMany({
      include: {
        order: true,
        food: true,
      },
    });
    return serializeForClient(items);
  } catch (err) {
    console.log("Error fetching order items:", err);
    throw new Error("Failed to fetch order items.");
  }
}
