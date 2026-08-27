"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireAdmin, requireRateLimitedAdmin } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { idSchema, validationMessage } from "@/lib/validation";

const zoneSchema = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(1, "Area name is required.").max(80),
  description: z.string().trim().max(300).default(""),
  deliveryFee: z.coerce.number().min(0).max(10_000),
  minimumOrder: z.coerce.number().min(0).max(100_000),
  estimatedMinutes: z.coerce.number().int().min(5).max(600),
  isAvailable: z.boolean(),
});

const hoursSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a valid opening time."),
  closeTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a valid closing time."),
  isClosed: z.boolean(),
});

const weeklyHoursSchema = z
  .array(hoursSchema)
  .length(7, "Opening hours are required for all seven days.")
  .superRefine((hours, context) => {
    if (new Set(hours.map((item) => item.dayOfWeek)).size !== 7) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each day may only appear once in the weekly schedule.",
      });
    }
  });

const couponSchema = z.object({
  id: idSchema.optional(),
  code: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Coupon codes may only contain letters, numbers, - and _.",
    ),
  description: z.string().trim().max(300).default(""),
  discountType: z.enum(["percentage", "fixed"]),
  value: z.coerce.number().positive().max(100_000),
  minimumOrder: z.coerce.number().min(0).max(100_000),
  expiresAt: z.string().nullable().optional(),
  usageLimit: z.coerce
    .number()
    .int()
    .positive()
    .max(1_000_000)
    .nullable()
    .optional(),
  userId: z
    .union([idSchema, z.literal("")])
    .nullable()
    .optional(),
  categoryId: z
    .union([idSchema, z.literal("")])
    .nullable()
    .optional(),
  isActive: z.boolean(),
});

function parseOrThrow<T>(
  result: { success: true; data: T } | { success: false; error: z.ZodError },
) {
  if (!result.success) throw new Error(validationMessage(result.error));
  return result.data;
}

export async function getAdminOperations() {
  await requireAdmin();
  const [zones, hours, coupons, users, categories] = await Promise.all([
    prisma.deliveryZone.findMany({ orderBy: { name: "asc" } }),
    prisma.restaurantHours.findMany({ orderBy: { dayOfWeek: "asc" } }),
    prisma.coupon.findMany({
      include: {
        user: { select: { name: true, email: true } },
        category: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.foodType.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return { zones, hours, coupons, users, categories };
}

export async function saveDeliveryZone(input: z.input<typeof zoneSchema>) {
  const actor = await requireRateLimitedAdmin();
  const data = parseOrThrow(zoneSchema.safeParse(input));
  const before = data.id
    ? await prisma.deliveryZone.findUnique({ where: { id: data.id } })
    : null;
  const zone = data.id
    ? await prisma.deliveryZone.update({
        where: { id: data.id },
        data: {
          name: data.name,
          description: data.description,
          deliveryFee: data.deliveryFee,
          minimumOrder: data.minimumOrder,
          estimatedMinutes: data.estimatedMinutes,
          isAvailable: data.isAvailable,
        },
      })
    : await prisma.deliveryZone.create({
        data: {
          name: data.name,
          description: data.description,
          deliveryFee: data.deliveryFee,
          minimumOrder: data.minimumOrder,
          estimatedMinutes: data.estimatedMinutes,
          isAvailable: data.isAvailable,
        },
      });
  await writeAuditLog(actor, {
    action: data.id ? "UPDATE_DELIVERY_ZONE" : "CREATE_DELIVERY_ZONE",
    entityType: "DeliveryZone",
    entityId: zone.id,
    changes: { before, after: zone },
  });
  return zone;
}

export async function deleteDeliveryZone(id: string) {
  const actor = await requireRateLimitedAdmin();
  const validId = parseOrThrow(idSchema.safeParse(id));
  const before = await prisma.deliveryZone.delete({ where: { id: validId } });
  await writeAuditLog(actor, {
    action: "DELETE_DELIVERY_ZONE",
    entityType: "DeliveryZone",
    entityId: validId,
    changes: { before },
  });
}

export async function saveRestaurantHours(
  input: z.input<typeof weeklyHoursSchema>,
) {
  const actor = await requireRateLimitedAdmin();
  const data = parseOrThrow(weeklyHoursSchema.safeParse(input));
  const before = await prisma.restaurantHours.findMany({
    orderBy: { dayOfWeek: "asc" },
  });
  const hours = await prisma.$transaction(
    data.map((item) =>
      prisma.restaurantHours.upsert({
        where: { dayOfWeek: item.dayOfWeek },
        create: item,
        update: item,
      }),
    ),
  );
  await writeAuditLog(actor, {
    action: "UPDATE_RESTAURANT_HOURS",
    entityType: "RestaurantHours",
    entityId: "weekly-schedule",
    changes: { before, after: hours },
  });
  return hours;
}

export async function saveCoupon(input: unknown) {
  const actor = await requireRateLimitedAdmin();
  const data = parseOrThrow(couponSchema.safeParse(input));
  if (data.discountType === "percentage" && data.value > 100)
    throw new Error("Percentage discounts cannot be greater than 100%.");
  const couponData = {
    code: data.code.toUpperCase(),
    description: data.description,
    discountType: data.discountType,
    value: data.value,
    minimumOrder: data.minimumOrder,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    usageLimit: data.usageLimit || null,
    userId: data.userId || null,
    categoryId: data.categoryId || null,
    isActive: data.isActive,
  };
  const before = data.id
    ? await prisma.coupon.findUnique({ where: { id: data.id } })
    : null;
  const coupon = data.id
    ? await prisma.coupon.update({ where: { id: data.id }, data: couponData })
    : await prisma.coupon.create({ data: couponData });
  await writeAuditLog(actor, {
    action: data.id ? "UPDATE_COUPON" : "CREATE_COUPON",
    entityType: "Coupon",
    entityId: coupon.id,
    changes: { before, after: coupon },
  });
  return coupon;
}

export async function deleteCoupon(id: string) {
  const actor = await requireRateLimitedAdmin();
  const validId = parseOrThrow(idSchema.safeParse(id));
  const before = await prisma.coupon.delete({ where: { id: validId } });
  await writeAuditLog(actor, {
    action: "DELETE_COUPON",
    entityType: "Coupon",
    entityId: validId,
    changes: { before },
  });
}
