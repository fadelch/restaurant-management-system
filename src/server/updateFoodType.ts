"use server";

import prisma from "@/lib/prisma";
import { requireRateLimitedAdmin } from "@/lib/auth";
import { idSchema } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

export async function updateFoodType(data: { id: string; name: string }) {
  const actor = await requireRateLimitedAdmin();
  const id = idSchema.parse(data.id);
  const name = z.string().trim().min(1).max(80).parse(data.name);
  const previous = await prisma.foodType.findUnique({ where: { id } });
  if (!previous) throw new Error("Food type not found.");

  const updated = await prisma.foodType.update({
    where: {
      id,
    },
    data: {
      name,
    },
  });
  await writeAuditLog(actor, {
    action: "UPDATE_FOOD_TYPE",
    entityType: "FoodType",
    entityId: id,
    changes: { before: { name: previous.name }, after: { name } },
  });
  return updated;
}
