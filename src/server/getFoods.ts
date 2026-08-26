"use server";

import prisma from "@/lib/prisma";
import { menuFoodInclude } from "@/lib/prismaSelects";

export async function getFoods() {
  try {
    return await prisma.food.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: menuFoodInclude,
    });
  } catch (err) {
    console.log("Error fetching foods:", err);
    throw new Error("Failed to fetch foods.");
  }
}
