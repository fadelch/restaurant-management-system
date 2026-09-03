"use server";

import prisma from "@/lib/prisma";
import { getRestaurantStatus } from "@/lib/restaurantHours";
import { serializeForClient } from "@/lib/serialize";
import { getRestaurantLaunchConfig } from "@/lib/restaurantConfig";
import { deriveOrderingAvailability } from "@/lib/restaurantConfigCore";

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
  const ordering = deriveOrderingAvailability(
    getRestaurantLaunchConfig().ordering,
    zones.length,
  );
  return serializeForClient({ restaurant, zones, ordering });
}
