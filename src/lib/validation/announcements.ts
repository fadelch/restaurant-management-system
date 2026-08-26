import { z } from "zod";
import { idSchema } from "@/lib/validation";

const optionalDateSchema = z
  .union([
    z.string().trim().datetime({ offset: true }),
    z.string().trim().datetime({ local: true }),
    z.literal(""),
    z.null(),
  ])
  .optional();

export const announcementSchema = z
  .object({
    id: idSchema.optional(),
    title: z.string().trim().min(2).max(150),
    message: z.string().trim().min(5).max(2_000),
    eventDate: optionalDateSchema,
    expiresAt: optionalDateSchema,
  })
  .superRefine((data, context) => {
    if (!data.eventDate || !data.expiresAt) return;
    if (new Date(data.expiresAt) < new Date(data.eventDate)) {
      context.addIssue({
        code: "custom",
        path: ["expiresAt"],
        message: "Expiration date cannot be before the event date.",
      });
    }
  });

export const announcementStatusSchema = z.enum([
  "all",
  "draft",
  "published",
  "expired",
]);

