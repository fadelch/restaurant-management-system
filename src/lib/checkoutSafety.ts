import { createHash } from "node:crypto";

export const CHECKOUT_RETRYABLE_CODES = new Set(["P2028", "P2034"]);
const RETRYABLE_DATABASE_CODES = new Set(["40001", "40P01"]);

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([first], [second]) => first.localeCompare(second))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

export function checkoutRequestHash(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

export function databaseErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

export function databaseNativeErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("meta" in error)) return null;
  const meta = (error as { meta?: unknown }).meta;
  if (!meta || typeof meta !== "object") return null;
  const directCode = (meta as { code?: unknown }).code;
  if (typeof directCode === "string" && /^[A-Z0-9]{5}$/.test(directCode)) {
    return directCode;
  }
  const driverError = (meta as { driverAdapterError?: unknown })
    .driverAdapterError;
  if (!driverError || typeof driverError !== "object" || !("cause" in driverError)) {
    return null;
  }
  const cause = (driverError as { cause?: unknown }).cause;
  if (!cause || typeof cause !== "object" || !("originalCode" in cause)) {
    return null;
  }
  const code = (cause as { originalCode?: unknown }).originalCode;
  return typeof code === "string" && /^[A-Z0-9]{5}$/.test(code) ? code : null;
}

export function isDatabaseError(error: unknown) {
  if (databaseErrorCode(error)) return true;
  return Boolean(
    error &&
      typeof error === "object" &&
      (error as { constructor?: { name?: string } }).constructor?.name?.startsWith(
        "PrismaClient",
      ),
  );
}

export function isRetryableCheckoutError(error: unknown) {
  const code = databaseErrorCode(error);
  return Boolean(
    (code && CHECKOUT_RETRYABLE_CODES.has(code)) ||
      (code === "P2010" &&
        RETRYABLE_DATABASE_CODES.has(databaseNativeErrorCode(error) || "")),
  );
}

export function isUniqueConstraintError(error: unknown) {
  return databaseErrorCode(error) === "P2002";
}

export class CheckoutRequestConflictError extends Error {
  constructor() {
    super(
      "This checkout request was already used with different order details. Please review your cart and try again.",
    );
    this.name = "CheckoutRequestConflictError";
  }
}

export class InsufficientStockError extends Error {
  constructor(foodName: string) {
    super(`${foodName} no longer has enough stock.`);
    this.name = "InsufficientStockError";
  }
}

export async function withCheckoutRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: {
    maxAttempts?: number;
    onRetry?: (error: unknown, attempt: number) => void | Promise<void>;
    delay?: (milliseconds: number) => Promise<void>;
  } = {},
) {
  const maxAttempts = Math.max(1, Math.min(options.maxAttempts ?? 3, 3));
  const delay =
    options.delay ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      if (attempt >= maxAttempts || !isRetryableCheckoutError(error)) {
        throw error;
      }
      await options.onRetry?.(error, attempt);
      const jitter = Math.floor(Math.random() * 20);
      await delay(25 * 2 ** (attempt - 1) + jitter);
    }
  }

  throw new Error("Checkout retry loop ended unexpectedly.");
}
