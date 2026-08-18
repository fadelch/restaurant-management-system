"use server";

import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { idSchema, validationMessage } from "@/lib/validation";

async function findUserByEmail(userEmail: string) {
  void userEmail;
  return requireUser();
}

export async function getFavoriteFoodIds(userEmail: string) {
  const user = await findUserByEmail(userEmail);
  if (!user) return [];

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    select: { foodId: true },
  });

  return favorites.map((favorite) => favorite.foodId);
}

export async function toggleFavorite(userEmail: string, foodId: string) {
  const user = await findUserByEmail(userEmail);

  if (!user) {
    throw new Error("Please log in to save favorite foods.");
  }

  const parsed = idSchema.safeParse(foodId);
  if (!parsed.success) throw new Error(validationMessage(parsed.error));
  foodId = parsed.data;
  const food = await prisma.food.findUnique({ where: { id: foodId } });

  if (!food) {
    throw new Error("Food not found.");
  }

  const key = {
    userId_foodId: {
      userId: user.id,
      foodId,
    },
  };
  const existing = await prisma.favorite.findUnique({ where: key });

  if (existing) {
    await prisma.favorite.delete({ where: key });
    return { foodId, isFavorite: false };
  }

  await prisma.favorite.create({
    data: {
      userId: user.id,
      foodId,
    },
  });

  return { foodId, isFavorite: true };
}
