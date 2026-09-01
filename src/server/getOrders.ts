"use server";

import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { adminOrderInclude } from "@/lib/prismaSelects";
import { serializeForClient } from "@/lib/serialize";

export async function getOrders() {
  await requireAdmin();
  try {
    const orders = await prisma.order.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: adminOrderInclude,
    });
    return serializeForClient(orders);
  } catch (err) {
    console.log("Error fetching orders:", err);
    throw new Error("Failed to fetch orders.");
  }
}
