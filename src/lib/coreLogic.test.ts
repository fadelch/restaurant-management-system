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
import {
  checkoutRequestHash,
  databaseNativeErrorCode,
  isRetryableCheckoutError,
  withCheckoutRetry,
} from "@/lib/checkoutSafety";
import { scrubSentryEvent } from "@/lib/sentryPrivacy";
import {
  assertAdminAccess,
  assertSuperAdminAccess,
} from "@/lib/authorization";
import { isAccountDisabled } from "@/lib/accountStatus";

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

describe("checkout safety primitives", () => {
  it("creates deterministic hashes without depending on object key order", () => {
    assert.equal(
      checkoutRequestHash({ customer: "A", items: [{ id: "1", qty: 2 }] }),
      checkoutRequestHash({ items: [{ qty: 2, id: "1" }], customer: "A" }),
    );
    assert.notEqual(
      checkoutRequestHash({ items: [{ id: "1", qty: 2 }] }),
      checkoutRequestHash({ items: [{ id: "1", qty: 3 }] }),
    );
  });

  it("retries only bounded transient Prisma transaction errors", async () => {
    let attempts = 0;
    const result = await withCheckoutRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) throw Object.assign(new Error("transient"), { code: "P2034" });
        return "completed";
      },
      { delay: async () => {} },
    );
    assert.equal(result, "completed");
    assert.equal(attempts, 3);
    assert.equal(isRetryableCheckoutError({ code: "P2028" }), true);
    assert.equal(isRetryableCheckoutError({ code: "P2002" }), false);
    const serializationFailure = {
      code: "P2010",
      meta: {
        driverAdapterError: { cause: { originalCode: "40001" } },
      },
    };
    assert.equal(databaseNativeErrorCode(serializationFailure), "40001");
    assert.equal(isRetryableCheckoutError(serializationFailure), true);
  });
});

describe("Sentry privacy", () => {
  it("removes request bodies, credentials, and known secret values", () => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgresql://private-test-value";
    try {
      const event = scrubSentryEvent({
        type: undefined,
        message: "Failure at postgresql://private-test-value",
        request: {
          data: { password: "private" },
          cookies: { session: "private" },
          query_string: "token=private",
          headers: {
            authorization: "Bearer private",
            accept: "application/json",
          },
        },
        user: { id: "user-id", email: "private@example.com" },
        extra: { password: "private", operation: "checkout" },
      });

      assert.equal(event.request?.data, undefined);
      assert.equal(event.request?.cookies, undefined);
      assert.equal(event.request?.query_string, undefined);
      assert.deepEqual(event.request?.headers, { accept: "application/json" });
      assert.deepEqual(event.user, { id: "user-id" });
      assert.equal(event.extra?.password, "[Filtered]");
      assert.equal(event.extra?.operation, "checkout");
      assert.equal(event.message, "Failure at [Filtered]");
    } finally {
      if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousDatabaseUrl;
    }
  });
});

describe("role authorization", () => {
  it("denies customers and keeps Super Admin actions distinct", () => {
    const customer = { hasAdminAccess: false, isSuperAdmin: false };
    const admin = { hasAdminAccess: true, isSuperAdmin: false };
    const superAdmin = { hasAdminAccess: true, isSuperAdmin: true };

    assert.throws(() => assertAdminAccess(customer), /Admin access/);
    assert.doesNotThrow(() => assertAdminAccess(admin));
    assert.throws(() => assertSuperAdminAccess(admin), /Super Admin access/);
    assert.doesNotThrow(() => assertSuperAdminAccess(superAdmin));
  });

  it("treats removed and banned accounts as disabled", () => {
    assert.equal(
      isAccountDisabled({ isBanned: false, deletedAt: null }),
      false,
    );
    assert.equal(
      isAccountDisabled({ isBanned: true, deletedAt: null }),
      true,
    );
    assert.equal(
      isAccountDisabled({ isBanned: false, deletedAt: new Date() }),
      true,
    );
  });
});
