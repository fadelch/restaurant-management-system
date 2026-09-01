"use server";

import prisma from "@/lib/prisma";
import { getRestaurantStatus } from "@/lib/restaurantHours";
import { serializeForClient } from "@/lib/serialize";

export async function getCheckoutSettings() {
  const [restaurant, zones] = await Promise.all([
    getRestaurantStatus(),
    prisma.deliveryZone.findMany({
      where: { isAvailable: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        deliveryFee: true,
        minimumOrder: true,
        estimatedMinutes: true,
      },
    }),
  ]);
  return serializeForClient({ restaurant, zones });
}
