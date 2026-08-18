import "server-only";

import prisma from "@/lib/prisma";

type Actor = { id: string; email: string | null };

export async function writeAuditLog(
  actor: Actor,
  entry: {
    action: string;
    entityType: string;
    entityId?: string | null;
    changes?: unknown;
  },
) {
  return prisma.auditLog.create({
    data: {
      adminId: actor.id,
      adminEmail: actor.email || "unknown-admin",
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId || null,
      changes: entry.changes
        ? JSON.parse(JSON.stringify(entry.changes))
        : undefined,
    },
  });
}
