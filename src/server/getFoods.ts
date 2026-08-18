"use server";

import prisma from "@/lib/prisma";

export async function getFoods() {
  try {
    return await prisma.food.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        type: true,
        orderItems: true,
      },
    });
  } catch (err) {
    console.log("Error fetching foods:", err);
    throw new Error("Failed to fetch foods.");
  }
}
