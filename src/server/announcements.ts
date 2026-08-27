"use server";

import type { Prisma } from "@/generated/prisma";
import prisma from "@/lib/prisma";
import {
  requireAdmin,
  requireRateLimitedAdmin,
  requireUser,
} from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { idSchema, validationMessage } from "@/lib/validation";
import {
  announcementSchema,
  announcementStatusSchema,
} from "@/lib/validation/announcements";
import {
  paginatedResult,
  paginationArgs,
  parsePageInput,
} from "@/lib/pagination";
import { resolveOrderBy } from "@/lib/sorting";
import { publicUserSelect } from "@/lib/prismaSelects";
import type { AnnouncementInput } from "@/types/announcement";
import type { PageInput } from "@/types/pagination";

function optionalDate(value?: string | null) {
  return value ? new Date(value) : null;
}

function parseId(id: string) {
  const result = idSchema.safeParse(id);
  if (!result.success) throw new Error(validationMessage(result.error));
  return result.data;
}

function parseAnnouncement(input: AnnouncementInput) {
  const result = announcementSchema.safeParse(input);
  if (!result.success) throw new Error(validationMessage(result.error));
  return result.data;
}

const announcementInclude = {
  createdBy: { select: publicUserSelect },
  _count: { select: { notifications: true } },
} satisfies Prisma.AnnouncementInclude;

export async function getAnnouncementPage(input: PageInput = {}) {
  await requireAdmin();
  const options = parsePageInput(input);
  const statusResult = announcementStatusSchema.safeParse(options.filter);
  const status = statusResult.success ? statusResult.data : "all";
  const now = new Date();
  const statusWhere: Prisma.AnnouncementWhereInput =
    status === "draft"
      ? { published: false }
      : status === "published"
        ? {
            published: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          }
        : status === "expired"
          ? { expiresAt: { lte: now } }
          : {};
  const where: Prisma.AnnouncementWhereInput = {
    AND: [
      statusWhere,
      ...(options.search
        ? [
            {
              OR: [
                {
                  title: {
                    contains: options.search,
                    mode: "insensitive" as const,
                  },
                },
                {
                  message: {
                    contains: options.search,
                    mode: "insensitive" as const,
                  },
                },
              ],
            },
          ]
        : []),
    ],
  };
  const orderBy = resolveOrderBy<Prisma.AnnouncementOrderByWithRelationInput>(
    options.sort,
    options.direction,
    {
      createdAt: (direction) => ({ createdAt: direction }),
      updatedAt: (direction) => ({ updatedAt: direction }),
      title: (direction) => ({ title: direction }),
      eventDate: (direction) => ({ eventDate: direction }),
    },
    "createdAt",
  );
  const [items, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      include: announcementInclude,
      orderBy,
      ...paginationArgs(options),
    }),
    prisma.announcement.count({ where }),
  ]);
  return paginatedResult(items, total, options);
}

export async function createAnnouncement(input: AnnouncementInput) {
  const actor = await requireRateLimitedAdmin();
  const data = parseAnnouncement(input);

  return prisma.$transaction(async (tx) => {
    const announcement = await tx.announcement.create({
      data: {
        title: data.title,
        message: data.message,
        eventDate: optionalDate(data.eventDate),
        expiresAt: optionalDate(data.expiresAt),
        createdById: actor.id,
      },
      include: announcementInclude,
    });
    await writeAuditLog(
      actor,
      {
        action: "CREATE_ANNOUNCEMENT",
        entityType: "Announcement",
        entityId: announcement.id,
        changes: { after: announcement },
      },
      tx,
    );
    return announcement;
  });
}

export async function updateAnnouncement(input: AnnouncementInput) {
  const actor = await requireRateLimitedAdmin();
  const data = parseAnnouncement(input);
  if (!data.id) throw new Error("Announcement ID is required.");

  return prisma.$transaction(async (tx) => {
    const before = await tx.announcement.findUnique({ where: { id: data.id } });
    if (!before) throw new Error("Announcement not found.");
    const announcement = await tx.announcement.update({
      where: { id: data.id },
      data: {
        title: data.title,
        message: data.message,
        eventDate: optionalDate(data.eventDate),
        expiresAt: optionalDate(data.expiresAt),
      },
      include: announcementInclude,
    });
    if (before.published) {
      await tx.notification.updateMany({
        where: { announcementId: before.id },
        data: { title: announcement.title, message: announcement.message },
      });
    }
    await writeAuditLog(
      actor,
      {
        action: "UPDATE_ANNOUNCEMENT",
        entityType: "Announcement",
        entityId: announcement.id,
        changes: { before, after: announcement },
      },
      tx,
    );
    return announcement;
  });
}

export async function setAnnouncementPublished(input: {
  id: string;
  published: boolean;
}) {
  const actor = await requireRateLimitedAdmin();
  const id = parseId(input.id);

  return prisma.$transaction(async (tx) => {
    const before = await tx.announcement.findUnique({ where: { id } });
    if (!before) throw new Error("Announcement not found.");
    if (before.published === input.published) return before;

    const announcement = await tx.announcement.update({
      where: { id },
      data: { published: input.published },
    });
    let notificationCount = 0;
    if (input.published) {
      const recipients = await tx.user.findMany({
        where: { isBanned: false },
        select: { id: true },
      });
      const result = await tx.notification.createMany({
        data: recipients.map((user) => ({
          userId: user.id,
          announcementId: announcement.id,
          title: announcement.title,
          message: announcement.message,
        })),
        skipDuplicates: true,
      });
      notificationCount = result.count;
    } else {
      const result = await tx.notification.deleteMany({
        where: { announcementId: announcement.id },
      });
      notificationCount = result.count;
    }
    await writeAuditLog(
      actor,
      {
        action: input.published
          ? "PUBLISH_ANNOUNCEMENT"
          : "UNPUBLISH_ANNOUNCEMENT",
        entityType: "Announcement",
        entityId: announcement.id,
        changes: {
          before: { published: before.published },
          after: { published: announcement.published },
          notificationCount,
        },
      },
      tx,
    );
    return announcement;
  });
}

export async function deleteAnnouncement(id: string) {
  const actor = await requireRateLimitedAdmin();
  const validId = parseId(id);

  return prisma.$transaction(async (tx) => {
    const before = await tx.announcement.findUnique({ where: { id: validId } });
    if (!before) throw new Error("Announcement not found.");
    const announcement = await tx.announcement.delete({
      where: { id: validId },
    });
    await writeAuditLog(
      actor,
      {
        action: "DELETE_ANNOUNCEMENT",
        entityType: "Announcement",
        entityId: validId,
        changes: { deleted: before },
      },
      tx,
    );
    return announcement;
  });
}

const publishedSelect = {
  id: true,
  title: true,
  message: true,
  eventDate: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AnnouncementSelect;

export async function getPublishedAnnouncements() {
  await requireUser();
  return prisma.announcement.findMany({
    where: {
      published: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: publishedSelect,
    orderBy: [{ eventDate: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
}

export async function getPublishedAnnouncementById(id: string) {
  await requireUser();
  return prisma.announcement.findFirst({
    where: {
      id: parseId(id),
      published: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: publishedSelect,
  });
}
