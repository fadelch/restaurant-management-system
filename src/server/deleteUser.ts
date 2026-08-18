"use server";

import prisma from "@/lib/prisma";
import { isSuperAdminEmail, requireSuperAdmin } from "@/lib/auth";
import { idSchema, validationMessage } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";

export async function deleteUser(data: {
  requesterEmail?: string;
  userId: string;
}) {
  try {
    const actor = await requireSuperAdmin();
    const parsed = idSchema.safeParse(data.userId);
    if (!parsed.success) throw new Error(validationMessage(parsed.error));
    const userId = parsed.data;

    const targetUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!targetUser) {
      throw new Error("User not found.");
    }

    if (isSuperAdminEmail(targetUser.email)) {
      throw new Error("You cannot delete the Super Admin.");
    }

    const deleted = await prisma.user.delete({
      where: {
        id: userId,
      },
    });
    await writeAuditLog(actor, {
      action: "DELETE_USER",
      entityType: "User",
      entityId: userId,
      changes: {
        deleted: {
          name: targetUser.name,
          email: targetUser.email,
          isAdmin: targetUser.isAdmin,
          isBanned: targetUser.isBanned,
        },
      },
    });
    return deleted;
  } catch (err) {
    console.log("Error deleting user:", err);
    throw err;
  }
}
