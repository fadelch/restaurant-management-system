import type { Prisma } from "@/generated/prisma";
import type { z } from "zod";
import type { announcementSchema } from "@/lib/validation/announcements";

export type AnnouncementInput = z.infer<typeof announcementSchema>;

export type AnnouncementItem = Prisma.AnnouncementGetPayload<{
  include: {
    createdBy: { select: { id: true; name: true; email: true } };
    _count: { select: { notifications: true } };
  };
}>;

export type PublishedAnnouncement = Prisma.AnnouncementGetPayload<{
  select: {
    id: true;
    title: true;
    message: true;
    eventDate: true;
    expiresAt: true;
    createdAt: true;
    updatedAt: true;
  };
}>;

