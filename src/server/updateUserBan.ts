"use server";

import prisma from "@/lib/prisma";
import {
  isSuperAdminEmail,
  requireRateLimitedSuperAdmin,
} from "@/lib/auth";
import { idSchema, validationMessage } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";

export async function updateUserBan(data: {
  requesterEmail?: string;
  userId: string;
  ban: boolean;
}) {
  try {
    const actor = await requireRateLimitedSuperAdmin();
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

    if (targetUser.deletedAt) {
      throw new Error("A removed account cannot be reactivated.");
    }

    if (isSuperAdminEmail(targetUser.email)) {
      throw new Error("You cannot ban the Super Admin.");
    }

    const updated = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        isBanned: data.ban,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        isBanned: true,
        createdAt: true,
      },
    });
    await writeAuditLog(actor, {
      action: data.ban ? "BAN_USER" : "UNBAN_USER",
      entityType: "User",
      entityId: userId,
      changes: {
        before: { isBanned: targetUser.isBanned },
        after: { isBanned: data.ban },
        targetEmail: targetUser.email,
      },
    });
    return updated;
  } catch (err) {
    console.log("Error updating user ban:", err);
    throw err;
  }
}
