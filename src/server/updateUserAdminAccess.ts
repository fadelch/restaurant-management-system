"use server";

import prisma from "@/lib/prisma";
import {
  isSuperAdminEmail,
  requireRateLimitedSuperAdmin,
} from "@/lib/auth";
import { idSchema, validationMessage } from "@/lib/validation";
import { writeAuditLog } from "@/lib/audit";

export async function updateUserAdminAccess(data: {
  requesterEmail?: string;
  userId: string;
  makeAdmin: boolean;
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
      throw new Error("A removed account cannot receive admin access.");
    }

    if (isSuperAdminEmail(targetUser.email)) {
      throw new Error("You cannot remove or modify the Super Admin.");
    }

    const updated = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        isAdmin: data.makeAdmin,
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
      action: data.makeAdmin ? "GRANT_ADMIN" : "REVOKE_ADMIN",
      entityType: "User",
      entityId: userId,
      changes: {
        before: { isAdmin: targetUser.isAdmin },
        after: { isAdmin: data.makeAdmin },
        targetEmail: targetUser.email,
      },
    });
    return updated;
  } catch (err) {
    console.log("Error updating admin access:", err);
    throw err;
  }
}
