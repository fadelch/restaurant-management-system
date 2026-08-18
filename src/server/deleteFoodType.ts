"use server";

import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { idSchema } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";

export async function deleteFoodType(id: string) {
  const actor = await requireAdmin();
  id = idSchema.parse(id);

  const foodsUsingType = await prisma.food.findMany({
    where: {
      typeId: id,
    },
  });

  if (foodsUsingType.length > 0) {
    throw new Error("Cannot delete food type because foods are using it.");
  }

  const deleted = await prisma.foodType.delete({
    where: {
      id,
    },
  });
  await writeAuditLog(actor, {
    action: "DELETE_FOOD_TYPE",
    entityType: "FoodType",
    entityId: id,
    changes: { name: deleted.name },
  });
  return deleted;
}
