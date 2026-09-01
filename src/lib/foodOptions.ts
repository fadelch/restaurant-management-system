import type { OptionalIngredient } from "@/types/food";
import { hasAtMostDecimalPlaces } from "@/lib/moneyInput";

export type { OptionalIngredient } from "@/types/food";

export function normalizeOptionalIngredients(
  value: unknown,
): OptionalIngredient[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const price =
      typeof record.price === "number" ? record.price : Number(record.price);
    if (
      !name ||
      !Number.isFinite(price) ||
      price < 0 ||
      !hasAtMostDecimalPlaces(price, 2)
    )
      return [];
    return [{ name, price }];
  });
}

export function optionalIngredientsToText(value: unknown) {
  return normalizeOptionalIngredients(value)
    .map((option) => `${option.name}:${option.price.toFixed(2)}`)
    .join(", ");
}

export function parseOptionalIngredientsText(
  value: string,
): OptionalIngredient[] {
  if (!value.trim()) return [];
  const options = value.split(",").map((part) => {
    const separator = part.lastIndexOf(":");
    if (separator < 1)
      throw new Error("Write each optional ingredient as Name:Price.");
    const name = part.slice(0, separator).trim();
    const price = Number(part.slice(separator + 1).trim());
    if (
      !name ||
      !Number.isFinite(price) ||
      price < 0 ||
      !hasAtMostDecimalPlaces(price, 2)
    ) {
      throw new Error(
        "Every optional ingredient needs a valid name and non-negative price with at most two decimal places.",
      );
    }
    return { name, price };
  });
  const names = new Set<string>();
  for (const option of options) {
    const key = option.name.toLowerCase();
    if (names.has(key))
      throw new Error(`${option.name} is listed more than once.`);
    names.add(key);
  }
  return options;
}
