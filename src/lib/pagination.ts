import type { z } from "zod";
import { pageOptionsSchema, validationMessage } from "@/lib/validation";
import type { PageInput, PaginatedResult } from "@/types/pagination";

export function parsePageInput(input: PageInput) {
  const result = pageOptionsSchema.safeParse(input);
  if (!result.success) throw new Error(validationMessage(result.error));
  return result.data;
}

export function paginationArgs(options: z.infer<typeof pageOptionsSchema>) {
  return {
    skip: (options.page - 1) * options.pageSize,
    take: options.pageSize,
  };
}

export function paginatedResult<T>(
  items: T[],
  total: number,
  options: z.infer<typeof pageOptionsSchema>,
): PaginatedResult<T> {
  return {
    items,
    total,
    page: options.page,
    pageSize: options.pageSize,
    pages: Math.max(1, Math.ceil(total / options.pageSize)),
  };
}
