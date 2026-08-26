import type { SortDirection } from "@/types/common";

export function resolveOrderBy<T>(
  requested: string,
  direction: SortDirection,
  allowed: Record<string, (direction: SortDirection) => T>,
  fallback: string,
): T {
  return (allowed[requested] || allowed[fallback])(direction);
}

