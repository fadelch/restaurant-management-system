"use server";

import prisma from "@/lib/prisma";

export async function getFoodById(id: string) {
  try {
    if (!id) {
      throw new Error("Food ID is required.");
    }

    return await prisma.food.findUnique({
      where: {
        id,
      },
      include: {
        type: true,
        orderItems: true,
      },
    });
  } catch (err) {
    console.log("Error fetching food:", err);
    throw new Error("Failed to fetch food.");
  }
}
