import "server-only";

import prisma from "@/lib/prisma";
import { getRestaurantLaunchConfig } from "@/lib/restaurantConfig";
import { evaluateRestaurantHours } from "@/lib/restaurantHoursCore";
import type { RestaurantPublicProfile } from "@/types/restaurant";

export async function getRestaurantHours() {
  return prisma.restaurantHours.findMany({
    orderBy: { dayOfWeek: "asc" },
    select: {
      dayOfWeek: true,
      openTime: true,
      closeTime: true,
      isClosed: true,
    },
  });
}

export async function getRestaurantStatus(date = new Date()) {
  const config = getRestaurantLaunchConfig();
  if (!config.approvals.hoursApproved) {
    return {
      isOpen: false,
      message: "Opening hours require restaurant approval.",
    };
  }
  const hours = await getRestaurantHours();
  return evaluateRestaurantHours(hours, date, config.identity.timeZone);
}

export async function getRestaurantPublicProfile(): Promise<RestaurantPublicProfile> {
  const config = getRestaurantLaunchConfig();
  const hours = await getRestaurantHours();
  if (!config.approvals.hoursApproved) {
    return {
      identity: config.identity,
      hours: [],
      status: {
        isOpen: false,
        message: "Opening hours require restaurant approval.",
      },
    };
  }
  return {
    identity: config.identity,
    hours,
    status: evaluateRestaurantHours(
      hours,
      new Date(),
      config.identity.timeZone,
    ),
  };
}
