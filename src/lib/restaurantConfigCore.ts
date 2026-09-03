import type { RestaurantLaunchConfig } from "@/types/restaurant";

const DEFAULT_TIME_ZONE = "Asia/Beirut";

type Environment = Record<string, string | undefined>;

function optionalValue(environment: Environment, name: string) {
  return environment[name]?.trim() || null;
}

function decision(environment: Environment, name: string) {
  return environment[name]?.trim().toLowerCase() === "true";
}

function hasBooleanDecision(environment: Environment, name: string) {
  const value = environment[name]?.trim().toLowerCase();
  return value === "true" || value === "false";
}

function validTimeZone(value: string | null) {
  if (!value) return DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return value;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

function validUsd(value: string | null) {
  if (!value || !/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= 100_000
    ? amount.toFixed(2)
    : null;
}

export function buildRestaurantLaunchConfig(
  environment: Environment,
): RestaurantLaunchConfig {
  return {
    identity: {
      name: optionalValue(environment, "RESTAURANT_NAME") || "Restaurant",
      logoUrl:
        optionalValue(environment, "RESTAURANT_LOGO_URL") || "/Logo.png",
      phone: optionalValue(environment, "RESTAURANT_PHONE"),
      whatsapp: optionalValue(environment, "RESTAURANT_WHATSAPP"),
      email: optionalValue(environment, "RESTAURANT_EMAIL"),
      address: optionalValue(environment, "RESTAURANT_ADDRESS"),
      mapUrl: optionalValue(environment, "RESTAURANT_MAP_URL"),
      instagramUrl: optionalValue(environment, "RESTAURANT_INSTAGRAM_URL"),
      facebookUrl: optionalValue(environment, "RESTAURANT_FACEBOOK_URL"),
      timeZone: validTimeZone(
        optionalValue(environment, "RESTAURANT_TIME_ZONE"),
      ),
      metaDescription:
        optionalValue(environment, "RESTAURANT_META_DESCRIPTION") ||
        "Online restaurant ordering.",
    },
    ordering: {
      deliveryEnabled: decision(environment, "RESTAURANT_DELIVERY_ENABLED"),
      pickupEnabled: decision(environment, "RESTAURANT_PICKUP_ENABLED"),
      cashPaymentEnabled: decision(environment, "RESTAURANT_COD_ENABLED"),
      deliveryRulesApproved: decision(
        environment,
        "RESTAURANT_DELIVERY_RULES_APPROVED",
      ),
      pickupInstructions: optionalValue(
        environment,
        "RESTAURANT_PICKUP_INSTRUCTIONS",
      ),
      pickupMinimumOrderUsd: validUsd(
        optionalValue(environment, "RESTAURANT_PICKUP_MINIMUM_ORDER_USD"),
      ),
    },
    approvals: {
      hoursApproved: decision(environment, "RESTAURANT_HOURS_APPROVED"),
      policiesApproved: decision(environment, "RESTAURANT_POLICIES_APPROVED"),
      assetRightsApproved: decision(
        environment,
        "RESTAURANT_ASSET_RIGHTS_APPROVED",
      ),
    },
  };
}

export function unresolvedRestaurantEnvironment(environment: Environment) {
  const required = [
    "RESTAURANT_NAME",
    "RESTAURANT_LOGO_URL",
    "RESTAURANT_PHONE",
    "RESTAURANT_EMAIL",
    "RESTAURANT_ADDRESS",
    "RESTAURANT_MAP_URL",
    "RESTAURANT_TIME_ZONE",
    "RESTAURANT_META_DESCRIPTION",
    "RESTAURANT_DELIVERY_ENABLED",
    "RESTAURANT_PICKUP_ENABLED",
    "RESTAURANT_COD_ENABLED",
  ];
  const unresolved = required.filter(
    (name) => !optionalValue(environment, name),
  );
  for (const name of [
    "RESTAURANT_DELIVERY_ENABLED",
    "RESTAURANT_PICKUP_ENABLED",
    "RESTAURANT_COD_ENABLED",
  ]) {
    if (!hasBooleanDecision(environment, name) && !unresolved.includes(name)) {
      unresolved.push(name);
    }
  }
  const config = buildRestaurantLaunchConfig(environment);

  if (
    config.ordering.pickupEnabled &&
    !optionalValue(environment, "RESTAURANT_PICKUP_INSTRUCTIONS")
  ) {
    unresolved.push("RESTAURANT_PICKUP_INSTRUCTIONS");
  }
  if (
    config.ordering.pickupEnabled &&
    !optionalValue(environment, "RESTAURANT_PICKUP_MINIMUM_ORDER_USD")
  ) {
    unresolved.push("RESTAURANT_PICKUP_MINIMUM_ORDER_USD");
  }
  return unresolved;
}

export function deriveOrderingAvailability(
  ordering: RestaurantLaunchConfig["ordering"],
  activeDeliveryZoneCount: number,
) {
  return {
    ...ordering,
    deliveryAvailable:
      ordering.cashPaymentEnabled &&
      ordering.deliveryRulesApproved &&
      ordering.deliveryEnabled &&
      activeDeliveryZoneCount > 0,
    pickupAvailable:
      ordering.cashPaymentEnabled &&
      ordering.deliveryRulesApproved &&
      ordering.pickupEnabled,
  };
}
