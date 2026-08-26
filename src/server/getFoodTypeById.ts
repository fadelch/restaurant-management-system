"use server";

import prisma from "@/lib/prisma";
import { idSchema, validationMessage } from "@/lib/validation";

export async function getFoodTypeById(id: string) {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) throw new Error(validationMessage(parsed.error));

  return await prisma.foodType.findUnique({
    where: {
      id: parsed.data,
    },
  });
}
