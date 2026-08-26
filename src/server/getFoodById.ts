"use server";

import prisma from "@/lib/prisma";
import { menuFoodInclude } from "@/lib/prismaSelects";
import { idSchema, validationMessage } from "@/lib/validation";

export async function getFoodById(id: string) {
  try {
    const parsed = idSchema.safeParse(id);
    if (!parsed.success) throw new Error(validationMessage(parsed.error));

    return await prisma.food.findUnique({
      where: {
        id: parsed.data,
      },
      include: menuFoodInclude,
    });
  } catch (err) {
    console.log("Error fetching food:", err);
    throw err;
  }
}
