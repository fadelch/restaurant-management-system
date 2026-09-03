"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { RestaurantPublicProfile } from "@/types/restaurant";

const RestaurantContext = createContext<RestaurantPublicProfile | null>(null);

export function RestaurantProvider({
  children,
  profile,
}: {
  children: ReactNode;
  profile: RestaurantPublicProfile;
}) {
  return (
    <RestaurantContext.Provider value={profile}>
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const profile = useContext(RestaurantContext);
  if (!profile) {
    throw new Error("RestaurantProvider is missing.");
  }
  return profile;
}
