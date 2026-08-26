"use server";

import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { idSchema, validationMessage } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";
import { deleteUploadedFoodImage } from "@/lib/uploads";

export async function deleteFood(id: string) {
  try {
    const actor = await requireAdmin();
    const parsed = idSchema.safeParse(id);
    if (!parsed.success) throw new Error(validationMessage(parsed.error));
    const food = await prisma.food.findUnique({
      where: { id: parsed.data },
      include: { _count: { select: { orderItems: true } } },
    });
    if (!food) throw new Error("Food not found.");
    if (food._count.orderItems > 0) {
      throw new Error(
        "This food is part of order history and cannot be deleted. Set its stock to zero instead.",
      );
    }
    const deleted = await prisma.food.delete({
      where: {
        id: parsed.data,
      },
    });
    await deleteUploadedFoodImage(food.image);
    await writeAuditLog(actor, {
      action: "DELETE_FOOD",
      entityType: "Food",
      entityId: food.id,
      changes: {
        deleted: {
          name: food.name,
          price: food.price,
          qty: food.qty,
          typeId: food.typeId,
        },
      },
    });
    return deleted;
  } catch (err) {
    console.log("Error deleting food:", err);
    throw err;
  }
}
