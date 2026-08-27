"use server";

import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  adminFoodInclude,
  publicMenuFoodSelect,
} from "@/lib/prismaSelects";
import { idSchema, validationMessage } from "@/lib/validation";

export async function getFoodById(id: string) {
  try {
    const parsed = idSchema.safeParse(id);
    if (!parsed.success) throw new Error(validationMessage(parsed.error));

    return await prisma.food.findUnique({
      where: {
        id: parsed.data,
      },
      select: publicMenuFoodSelect,
    });
  } catch (err) {
    console.log("Error fetching food:", err);
    throw err;
  }
}

export async function getAdminFoodById(id: string) {
  await requireAdmin();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  return prisma.food.findUnique({
    where: { id: parsed.data },
    include: adminFoodInclude,
  });
}
