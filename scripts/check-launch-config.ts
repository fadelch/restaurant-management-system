import { loadEnvConfig } from "@next/env";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

loadEnvConfig(process.cwd());

const required = process.argv.includes("--require-configured");
const knownPlaceholder =
  /your restaurant|\+961\s*x|example\.(?:com|org|net)|["'`]PLACEHOLDER(?: VALUE| TEXT)?["'`]|(?:\/\/|\/\*)\s*TODO\b/i;

async function userFacingPlaceholderFiles(directory: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await userFacingPlaceholderFiles(absolute)));
    } else if (
      /\.(?:ts|tsx|json)$/.test(entry.name) &&
      !entry.name.endsWith(".test.ts") &&
      knownPlaceholder.test(await readFile(absolute, "utf8"))
    ) {
      found.push(path.relative(process.cwd(), absolute).replaceAll("\\", "/"));
    }
  }
  return found;
}

async function run() {
  const [configuration, prismaModule] = await Promise.all([
    import("../src/lib/restaurantConfigCore"),
    import("../src/lib/prisma"),
  ]);
  const prisma = prismaModule.default;
  const config = configuration.buildRestaurantLaunchConfig(process.env);
  const issues = configuration
    .unresolvedRestaurantEnvironment(process.env)
    .map((name) => `Environment decision missing or invalid: ${name}`);
  for (const name of [
    "RESTAURANT_NAME",
    "RESTAURANT_LOGO_URL",
    "RESTAURANT_PHONE",
    "RESTAURANT_EMAIL",
    "RESTAURANT_ADDRESS",
    "RESTAURANT_MAP_URL",
    "RESTAURANT_META_DESCRIPTION",
  ]) {
    if (knownPlaceholder.test(process.env[name] || "")) {
      issues.push(`Placeholder value remains in environment field: ${name}`);
    }
  }
  const placeholderFiles = [
    ...(await userFacingPlaceholderFiles(path.join(process.cwd(), "src", "app"))),
    ...(await userFacingPlaceholderFiles(
      path.join(process.cwd(), "src", "components"),
    )),
    ...(await userFacingPlaceholderFiles(
      path.join(process.cwd(), "src", "i18n"),
    )),
  ];
  for (const file of placeholderFiles) {
    issues.push(`Known user-facing placeholder remains: ${file}`);
  }

  for (const approval of [
    "RESTAURANT_HOURS_APPROVED",
    "RESTAURANT_DELIVERY_RULES_APPROVED",
    "RESTAURANT_POLICIES_APPROVED",
    "RESTAURANT_ASSET_RIGHTS_APPROVED",
  ]) {
    if (process.env[approval]?.trim().toLowerCase() !== "true") {
      issues.push(`Owner approval not recorded: ${approval}`);
    }
  }

  if (!config.ordering.deliveryEnabled && !config.ordering.pickupEnabled) {
    issues.push("Neither delivery nor pickup has been enabled.");
  }
  if (!config.ordering.cashPaymentEnabled) {
    issues.push("Cash payment has not been enabled.");
  }
  if (!config.identity.logoUrl.startsWith("/")) {
    issues.push("RESTAURANT_LOGO_URL must be a local public asset path.");
  }
  for (const name of [
    "RESTAURANT_MAP_URL",
    "RESTAURANT_WHATSAPP",
    "RESTAURANT_INSTAGRAM_URL",
    "RESTAURANT_FACEBOOK_URL",
  ]) {
    const value = process.env[name]?.trim();
    if (!value) continue;
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      issues.push(`${name} must be a valid HTTP(S) URL.`);
    }
  }
  if (
    process.env.RESTAURANT_EMAIL &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.RESTAURANT_EMAIL)
  ) {
    issues.push("RESTAURANT_EMAIL must be a valid email address.");
  }
  if (process.env.RESTAURANT_TIME_ZONE) {
    try {
      new Intl.DateTimeFormat("en-US", {
        timeZone: process.env.RESTAURANT_TIME_ZONE,
      }).format();
    } catch {
      issues.push("RESTAURANT_TIME_ZONE must be a valid IANA timezone.");
    }
  }

  try {
    const [hours, activeZones, currencySettings] = await Promise.all([
      prisma.restaurantHours.findMany({
        select: { dayOfWeek: true },
      }),
      prisma.deliveryZone.count({ where: { isAvailable: true } }),
      prisma.restaurantSettings.findUnique({
        where: { id: 1 },
        select: { usdToLbpRate: true },
      }),
    ]);
    if (
      hours.length !== 7 ||
      new Set(hours.map((row) => row.dayOfWeek)).size !== 7
    ) {
      issues.push("A complete seven-day opening-hours schedule is missing.");
    }
    if (config.ordering.deliveryEnabled && activeZones === 0) {
      issues.push("Delivery is enabled but there are zero available zones.");
    }
    if (!currencySettings?.usdToLbpRate) {
      issues.push("The USD/LBP rate is not configured.");
    }
  } finally {
    await prisma.$disconnect();
  }

  if (issues.length === 0) {
    console.log("CUSTOMER LAUNCH CONFIGURATION: PASS");
    return;
  }

  console.warn("CUSTOMER LAUNCH CONFIGURATION: NOT READY");
  for (const issue of issues) console.warn(`- ${issue}`);
  if (required) {
    console.error("REQUIRED CUSTOMER CONFIGURATION: FAIL");
    process.exitCode = 2;
  }
}

run().catch((error: unknown) => {
  console.error(
    "CUSTOMER LAUNCH CONFIGURATION: FAIL",
    error instanceof Error ? error.message : "Unknown error",
  );
  process.exitCode = 1;
});
