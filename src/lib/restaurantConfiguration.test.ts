import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRestaurantLaunchConfig,
  deriveOrderingAvailability,
  unresolvedRestaurantEnvironment,
} from "@/lib/restaurantConfigCore";
import { evaluateRestaurantHours } from "@/lib/restaurantHoursCore";

const configuredEnvironment = {
  RESTAURANT_NAME: "Test Restaurant",
  RESTAURANT_LOGO_URL: "/test-logo.png",
  RESTAURANT_PHONE: "+961 1 000 000",
  RESTAURANT_EMAIL: "orders@example.invalid",
  RESTAURANT_ADDRESS: "Test address",
  RESTAURANT_MAP_URL: "https://maps.example.invalid/location",
  RESTAURANT_TIME_ZONE: "UTC",
  RESTAURANT_META_DESCRIPTION: "Test description",
  RESTAURANT_DELIVERY_ENABLED: "true",
  RESTAURANT_PICKUP_ENABLED: "true",
  RESTAURANT_COD_ENABLED: "true",
  RESTAURANT_PICKUP_INSTRUCTIONS: "Use the pickup counter.",
  RESTAURANT_PICKUP_MINIMUM_ORDER_USD: "10.00",
  RESTAURANT_HOURS_APPROVED: "true",
  RESTAURANT_DELIVERY_RULES_APPROVED: "true",
  RESTAURANT_POLICIES_APPROVED: "true",
  RESTAURANT_ASSET_RIGHTS_APPROVED: "true",
};

describe("restaurant launch configuration", () => {
  it("keeps unresolved values explicit and disables ordering by default", () => {
    const config = buildRestaurantLaunchConfig({});
    assert.equal(config.identity.name, "Restaurant");
    assert.equal(config.ordering.deliveryEnabled, false);
    assert.equal(config.ordering.pickupEnabled, false);
    assert.equal(config.ordering.cashPaymentEnabled, false);
    assert.ok(unresolvedRestaurantEnvironment({}).includes("RESTAURANT_NAME"));
  });

  it("accepts explicit business decisions without inventing values", () => {
    const config = buildRestaurantLaunchConfig(configuredEnvironment);
    assert.equal(config.identity.timeZone, "UTC");
    assert.equal(config.ordering.pickupMinimumOrderUsd, "10.00");
    assert.deepEqual(unresolvedRestaurantEnvironment(configuredEnvironment), []);
  });

  it("makes delivery unavailable when there are zero active zones", () => {
    const config = buildRestaurantLaunchConfig(configuredEnvironment);
    assert.equal(
      deriveOrderingAvailability(config.ordering, 0).deliveryAvailable,
      false,
    );
    assert.equal(
      deriveOrderingAvailability(config.ordering, 1).deliveryAvailable,
      true,
    );
  });
});

describe("authoritative restaurant hours", () => {
  const schedule = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    openTime: "09:00",
    closeTime: "17:00",
    isClosed: dayOfWeek === 2,
  }));

  it("reports a normal configured opening day", () => {
    const status = evaluateRestaurantHours(
      schedule,
      new Date("2026-09-03T12:00:00Z"),
      "UTC",
    );
    assert.equal(status.isOpen, true);
  });

  it("reports a configured closed day", () => {
    const status = evaluateRestaurantHours(
      schedule,
      new Date("2026-09-01T12:00:00Z"),
      "UTC",
    );
    assert.equal(status.isOpen, false);
  });

  it("keeps an overnight shift open after midnight", () => {
    const overnight = schedule.map((row) =>
      row.dayOfWeek === 3
        ? { ...row, openTime: "20:00", closeTime: "02:00", isClosed: false }
        : row,
    );
    const status = evaluateRestaurantHours(
      overnight,
      new Date("2026-09-03T01:00:00Z"),
      "UTC",
    );
    assert.equal(status.isOpen, true);
  });
});
