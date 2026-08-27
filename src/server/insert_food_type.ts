"use server";

import prisma from "@/lib/prisma";
import { requireRateLimitedAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

export async function insert_food_type(data: { name: string }) {
  try {
    const actor = await requireRateLimitedAdmin();
    const name = z
      .string()
      .trim()
      .min(1, "Food type name is required.")
      .max(80)
      .parse(data.name);

    const exists = await prisma.foodType.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });

    if (exists) {
      throw new Error("Food type already exists.");
    }

    const type = await prisma.foodType.create({
      data: {
        name,
      },
    });
    await writeAuditLog(actor, {
      action: "CREATE_FOOD_TYPE",
      entityType: "FoodType",
      entityId: type.id,
      changes: { name },
    });
    return type;
  } catch (err) {
    console.log("Error inserting food type:", err);
    throw err;
  }
}
