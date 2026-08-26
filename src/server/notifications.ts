"use server";

import { z } from "zod";
import type { Prisma } from "@/generated/prisma";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { idSchema, validationMessage } from "@/lib/validation";

const limitSchema = z.coerce.number().int().min(1).max(50).default(8);

const notificationInclude = {
  announcement: {
    select: {
      id: true,
      eventDate: true,
      expiresAt: true,
      published: true,
    },
  },
} satisfies Prisma.NotificationInclude;

export async function getNotificationSummary(limit: number = 8) {
  const user = await requireUser();
  const parsedLimit = limitSchema.safeParse(limit);
  if (!parsedLimit.success)
    throw new Error(validationMessage(parsedLimit.error));
  const where: Prisma.NotificationWhereInput = {
    userId: user.id,
    announcement: {
      published: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  };
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      include: notificationInclude,
      orderBy: { createdAt: "desc" },
      take: parsedLimit.data,
    }),
    prisma.notification.count({ where: { ...where, read: false } }),
  ]);
  return { items, unreadCount };
}

export async function markNotificationRead(id: string) {
  const user = await requireUser();
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) throw new Error(validationMessage(parsed.error));
  const result = await prisma.notification.updateMany({
    where: { id: parsed.data, userId: user.id },
    data: { read: true },
  });
  if (result.count !== 1) throw new Error("Notification not found.");
  return { id: parsed.data };
}

export async function markAllNotificationsRead() {
  const user = await requireUser();
  const result = await prisma.notification.updateMany({
    where: { userId: user.id, read: false },
    data: { read: true },
  });
  return { count: result.count };
}
