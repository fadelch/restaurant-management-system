"use server";

import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function getOrderItems() {
  await requireAdmin();
  try {
    return await prisma.orderItem.findMany({
      include: {
        order: true,
        food: true,
      },
    });
  } catch (err) {
    console.log("Error fetching order items:", err);
    throw new Error("Failed to fetch order items.");
  }
}
