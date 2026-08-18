"use server";

import prisma from "@/lib/prisma";

export async function getFoodTypeById(id: string) {
  if (!id) {
    throw new Error("Food type ID is required.");
  }

  return await prisma.foodType.findUnique({
    where: {
      id,
    },
  });
}
