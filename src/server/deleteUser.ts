"use server";

import prisma from "@/lib/prisma";
import {
  isSuperAdminEmail,
  requireRateLimitedSuperAdmin,
} from "@/lib/auth";
import { idSchema, validationMessage } from "@/lib/validation";
import { removeUserAccount } from "@/server/accountRemovalService";

export async function deleteUser(data: {
  requesterEmail?: string;
  userId: string;
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

    if (isSuperAdminEmail(targetUser.email)) {
      throw new Error("You cannot delete the Super Admin.");
    }

    return await removeUserAccount(userId, actor);
  } catch (err) {
    console.log("Error deleting user:", err);
    throw err;
  }
}
