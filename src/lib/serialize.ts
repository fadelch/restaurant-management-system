import "server-only";

import { Prisma } from "@/generated/prisma";

export type Serialized<T> = T extends Prisma.Decimal
  ? number
  : T extends Date
    ? Date
    : T extends readonly (infer Item)[]
      ? Serialized<Item>[]
      : T extends object
        ? { [Key in keyof T]: Serialized<T[Key]> }
        : T;

export function serializeForClient<T>(value: T): Serialized<T> {
  if (Prisma.Decimal.isDecimal(value)) {
    return value.toNumber() as Serialized<T>;
  }
  if (value instanceof Date) return value as Serialized<T>;
  if (Array.isArray(value)) {
    return value.map((item) => serializeForClient(item)) as Serialized<T>;
  }
  if (value && typeof value === "object") {
    const serialized: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      serialized[key] = serializeForClient(item);
    }
    return serialized as Serialized<T>;
  }
  return value as Serialized<T>;
}
