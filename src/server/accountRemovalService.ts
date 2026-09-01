import "server-only";

import type { Prisma } from "@/generated/prisma";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

type Actor = { id: string; email: string | null };

const removedUserSelect = {
  id: true,
  name: true,
  email: true,
  isAdmin: true,
  isBanned: true,
  createdAt: true,
  deletedAt: true,
} satisfies Prisma.UserSelect;

export async function removeUserAccount(userId: string, actor: Actor) {
  return prisma.$transaction(
    async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: userId },
        select: {
          ...removedUserSelect,
          _count: {
            select: {
              orders: true,
              foodIssueReports: true,
              auditLogs: true,
              stockMovements: true,
              announcements: true,
            },
          },
        },
      });

      if (!target) throw new Error("User not found.");
      if (target.deletedAt) throw new Error("This account was already removed.");

      const history = {
        orders: target._count.orders,
        foodIssueReports: target._count.foodIssueReports,
        auditLogs: target._count.auditLogs,
        stockMovements: target._count.stockMovements,
        announcements: target._count.announcements,
      };
      const hasBusinessHistory = Object.values(history).some(
        (count) => count > 0,
      );

      if (hasBusinessHistory) {
        const deletedAt = new Date();
        const user = await tx.user.update({
          where: { id: userId },
          data: {
            name: null,
            email: null,
            password: null,
            sessionVersion: { increment: 1 },
            isAdmin: false,
            isBanned: true,
            deletedAt,
          },
          select: removedUserSelect,
        });

        await writeAuditLog(
          actor,
          {
            action: "ANONYMIZE_USER",
            entityType: "User",
            entityId: userId,
            changes: {
              removalMode: "anonymized",
              previousAccess: {
                isAdmin: target.isAdmin,
                isBanned: target.isBanned,
              },
              retainedHistory: history,
              deletedAt,
            },
          },
          tx,
        );

        return { mode: "anonymized" as const, user };
      }

      const user = await tx.user.delete({
        where: { id: userId },
        select: removedUserSelect,
      });
      await writeAuditLog(
        actor,
        {
          action: "DELETE_HISTORY_FREE_USER",
          entityType: "User",
          entityId: userId,
          changes: {
            removalMode: "deleted",
            previousAccess: {
              isAdmin: target.isAdmin,
              isBanned: target.isBanned,
            },
          },
        },
        tx,
      );

      return { mode: "deleted" as const, user };
    },
    { isolationLevel: "Serializable" },
  );
}
