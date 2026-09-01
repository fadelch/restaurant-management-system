"use server";

import prisma from "@/lib/prisma";
import { publicMenuFoodSelect } from "@/lib/prismaSelects";
import { serializeForClient } from "@/lib/serialize";

export async function getFoods() {
  try {
    const [foods, sales] = await prisma.$transaction([
      prisma.food.findMany({
        orderBy: { createdAt: "desc" },
        select: publicMenuFoodSelect,
      }),
      prisma.orderItem.groupBy({
        by: ["foodId"],
        orderBy: { foodId: "asc" },
        _sum: { quantity: true },
      }),
    ]);
    const popularityByFood = new Map(
      sales.map((sale) => [sale.foodId, sale._sum?.quantity || 0]),
    );
    return serializeForClient(foods.map((food) => ({
      ...food,
      popularity: popularityByFood.get(food.id) || 0,
    })));
  } catch (err) {
    console.log("Error fetching foods:", err);
    throw new Error("Failed to fetch foods.");
  }
}
