import "server-only";

import { buildRestaurantLaunchConfig } from "@/lib/restaurantConfigCore";

export function getRestaurantLaunchConfig() {
  return buildRestaurantLaunchConfig(process.env);
}
