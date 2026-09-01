import "server-only";

import prisma from "@/lib/prisma";

export async function getCurrencySettings() {
  return prisma.restaurantSettings.findUnique({
    where: { id: 1 },
    select: {
      usdToLbpRate: true,
      updatedAt: true,
      updatedById: true,
    },
  });
}

export async function getCurrentUsdToLbpRate() {
  const settings = await getCurrencySettings();
  return settings?.usdToLbpRate ?? null;
}
