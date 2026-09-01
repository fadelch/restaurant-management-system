import { z } from "zod";
import { hasAtMostDecimalPlaces } from "@/lib/moneyInput";

export const usdAmountSchema = z
  .number()
  .finite()
  .refine(
    (value) => hasAtMostDecimalPlaces(value, 2),
    "USD amounts may contain at most two decimal places.",
  );

export const idSchema = z.string().trim().uuid("A valid ID is required.");
export const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .max(254);
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be 72 characters or fewer.")
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[0-9]/, "Password must include a number.")
  .regex(/[^A-Za-z0-9]/, "Password must include a special character.");

export const foodSchema = z.object({
  name: z.string().trim().min(1, "Food name is required.").max(100),
  description: z
    .string()
    .trim()
    .max(500, "Description must be 500 characters or fewer.")
    .nullable()
    .optional(),
  ingredients: z.array(z.string().trim().min(1).max(50)).max(30).default([]),
  optionalIngredients: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(50),
        price: usdAmountSchema.min(0).max(1_000),
      }),
    )
    .max(30)
    .default([]),
  extraCheesePrice: usdAmountSchema
    .min(0, "Extra-cheese price cannot be negative.")
    .max(1_000)
    .default(1.5),
  price: usdAmountSchema
    .positive("Price must be greater than 0.")
    .max(100_000),
  qty: z.number().int().min(0, "Quantity cannot be negative.").max(1_000_000),
  minStock: z.number().int().min(0).max(1_000_000).default(5),
  image: z.string().trim().max(500).nullable().optional(),
  typeId: idSchema,
});

export const orderStatusSchema = z.enum([
  "pending",
  "preparing",
  "done",
  "cancelled",
]);

export const paymentStatusSchema = z.enum([
  "pending",
  "done",
  "cancelled",
  "refunded",
]);

export const foodIssueReasonSchema = z.enum([
  "damaged",
  "spoiled",
  "foreign_object",
  "wrong_item",
  "other",
]);

export const foodIssueStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
]);

export const pageOptionsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(10),
  search: z.string().trim().max(100).default(""),
  sort: z.string().trim().max(50).default("createdAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
  filter: z.string().trim().max(50).default("all"),
});

export function validationMessage(error: z.ZodError) {
  return error.issues[0]?.message || "Please check the entered information.";
}
