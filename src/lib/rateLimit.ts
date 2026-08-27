import "server-only";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitPolicy =
  | "login-ip"
  | "login-account"
  | "signup-ip"
  | "checkout-user"
  | "image-upload-admin"
  | "food-issue-user"
  | "admin-user";

type FailurePolicy = "closed" | "open";

const policySettings: Record<
  RateLimitPolicy,
  { limit: number; window: `${number} ${"s" | "m" | "h"}` }
> = {
  "login-ip": { limit: 10, window: "10 m" },
  "login-account": { limit: 5, window: "10 m" },
  "signup-ip": { limit: 5, window: "10 m" },
  "checkout-user": { limit: 10, window: "1 m" },
  "image-upload-admin": { limit: 10, window: "10 m" },
  "food-issue-user": { limit: 5, window: "10 m" },
  "admin-user": { limit: 60, window: "1 m" },
};

const limiterCache = new Map<RateLimitPolicy, Ratelimit>();

export class RateLimitExceededError extends Error {
  readonly status = 429;
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Too many attempts. Please try again later.");
    this.name = "RateLimitExceededError";
    this.retryAfterSeconds = Math.max(1, retryAfterSeconds);
  }
}

export class RateLimitUnavailableError extends Error {
  readonly status = 503;

  constructor() {
    super("This request cannot be completed right now. Please try again soon.");
    this.name = "RateLimitUnavailableError";
  }
}

function rateLimitConfigured() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function limiter(policy: RateLimitPolicy) {
  const cached = limiterCache.get(policy);
  if (cached) return cached;

  const setting = policySettings[policy];
  const next = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(setting.limit, setting.window),
    prefix: `restaurant:ratelimit:${policy}`,
    ephemeralCache: false,
    timeout: 2_000,
    analytics: process.env.RATE_LIMIT_ANALYTICS === "true",
  });
  limiterCache.set(policy, next);
  return next;
}

function identifierHash(scope: string, identifier: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new RateLimitUnavailableError();
  return createHmac("sha256", secret)
    .update(`${scope}:${identifier.trim().toLowerCase()}`)
    .digest("hex");
}

export async function requestIpAddress() {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || requestHeaders.get("x-real-ip")?.trim() || "unknown";
}

export async function enforceRateLimit({
  policy,
  identifier,
  failurePolicy,
}: {
  policy: RateLimitPolicy;
  identifier: string;
  failurePolicy: FailurePolicy;
}) {
  if (!rateLimitConfigured()) {
    if (process.env.NODE_ENV === "production" && failurePolicy === "closed") {
      console.error("Required production rate limiter is not configured.", {
        policy,
      });
      throw new RateLimitUnavailableError();
    }
    return { limited: false, configured: false };
  }

  try {
    const result = await limiter(policy).limit(
      identifierHash(policy, identifier),
    );
    if (result.reason === "timeout") {
      console.error("Distributed rate limiter timed out.", { policy });
      if (failurePolicy === "closed") throw new RateLimitUnavailableError();
      return { limited: false, configured: true };
    }
    if (!result.success) {
      throw new RateLimitExceededError(
        Math.ceil((result.reset - Date.now()) / 1_000),
      );
    }
    return {
      limited: false,
      configured: true,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    if (
      error instanceof RateLimitExceededError ||
      error instanceof RateLimitUnavailableError
    ) {
      throw error;
    }
    console.error("Distributed rate limiter failed.", {
      policy,
      errorType:
        error instanceof Error ? error.constructor.name : "UnknownError",
    });
    if (failurePolicy === "closed") throw new RateLimitUnavailableError();
    return { limited: false, configured: true };
  }
}

