import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  foodSchema,
  orderStatusSchema,
  pageOptionsSchema,
  passwordSchema,
} from "@/lib/validation";
import {
  normalizeOptionalIngredients,
  parseOptionalIngredientsText,
} from "@/lib/foodOptions";
import {
  paginatedResult,
  paginationArgs,
  parsePageInput,
} from "@/lib/pagination";
import { resolveOrderBy } from "@/lib/sorting";

describe("security-sensitive input validation", () => {
  it("accepts a strong password and rejects weak passwords", () => {
    assert.equal(passwordSchema.safeParse("Strong!Pass9").success, true);
    assert.equal(passwordSchema.safeParse("password").success, false);
    assert.equal(passwordSchema.safeParse("NoSpecial9").success, false);
  });

  it("rejects invalid order states and unsafe food values", () => {
    assert.equal(orderStatusSchema.safeParse("cancelled").success, true);
    assert.equal(orderStatusSchema.safeParse("refunded").success, false);
    assert.equal(
      foodSchema.safeParse({
        name: "Burger",
        price: -1,
        qty: -2,
        typeId: "not-a-uuid",
      }).success,
      false,
    );
  });
});

describe("bounded pagination and sorting", () => {
  it("coerces valid page input and calculates bounded query arguments", () => {
    const options = parsePageInput({ page: "2", pageSize: "25" });
    assert.deepEqual(paginationArgs(options), { skip: 25, take: 25 });
    assert.deepEqual(paginatedResult(["row"], 51, options), {
      items: ["row"],
      total: 51,
      page: 2,
      pageSize: 25,
      pages: 3,
    });
  });

  it("rejects oversized pages", () => {
    assert.equal(pageOptionsSchema.safeParse({ pageSize: 101 }).success, false);
  });

  it("uses an allowlisted fallback for unknown sort fields", () => {
    const result = resolveOrderBy<Record<string, "asc" | "desc">>(
      "password",
      "asc",
      {
        createdAt: (direction) => ({ createdAt: direction }),
        name: (direction) => ({ name: direction }),
      },
      "createdAt",
    );
    assert.deepEqual(result, { createdAt: "asc" });
  });
});

describe("food customization normalization", () => {
  it("drops malformed or negative optional ingredients", () => {
    assert.deepEqual(
      normalizeOptionalIngredients([
        { name: " Olives ", price: "1.25" },
        { name: "Bad", price: -1 },
        null,
      ]),
      [{ name: "Olives", price: 1.25 }],
    );
  });

  it("rejects duplicate optional ingredient names case-insensitively", () => {
    assert.throws(
      () => parseOptionalIngredientsText("Olives:1, olives:2"),
      /listed more than once/,
    );
  });
});
