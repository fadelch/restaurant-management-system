"use server";

import prisma from "@/lib/prisma";

export async function getFoodTypes() {
  try {
    return await prisma.foodType.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });
  } catch (err) {
    console.log("Error fetching food types:", err);
    throw new Error("Failed to fetch food types.");
  }
}
