import type { z } from "zod";
import type { pageOptionsSchema } from "@/lib/validation";

export type PageInput = Partial<z.input<typeof pageOptionsSchema>>;

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
};

