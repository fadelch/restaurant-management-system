import "server-only";

import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { decimal, type DecimalValue } from "@/lib/money";

type AdminActor = { id: string; email: string | null };

export async function updateUsdToLbpRateForAdmin(
  actor: AdminActor,
  usdToLbpRate: DecimalValue,
) {
  const rate = decimal(usdToLbpRate);
  if (
    !rate.greaterThan(0) ||
    rate.greaterThan(10_000_000) ||
    rate.decimalPlaces() > 4
  ) {
    throw new Error(
      "The USD/LBP rate must be positive, no greater than 10,000,000, and use at most four decimal places.",
    );
  }
  const before = await prisma.restaurantSettings.findUnique({
    where: { id: 1 },
  });
  const settings = await prisma.restaurantSettings.upsert({
    where: { id: 1 },
    create: { id: 1, usdToLbpRate: rate, updatedById: actor.id },
    update: { usdToLbpRate: rate, updatedById: actor.id },
  });
  await writeAuditLog(actor, {
    action: "UPDATE_USD_LBP_RATE",
    entityType: "RestaurantSettings",
    entityId: "1",
    changes: {
      before: { usdToLbpRate: before?.usdToLbpRate ?? null },
      after: {
        usdToLbpRate: settings.usdToLbpRate,
        updatedAt: settings.updatedAt,
      },
    },
  });
  return settings;
}
