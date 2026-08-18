"use server";

import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function getOrders() {
  await requireAdmin();
  try {
    return await prisma.order.findMany({
      orderBy: {
        createdAt: "desc",
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
    console.log("Error fetching orders:", err);
    throw new Error("Failed to fetch orders.");
  }
}
