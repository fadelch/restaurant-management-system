import { createHmac, randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

loadEnvConfig(process.cwd());

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const hashSecret = process.env.AUTH_SECRET;
const requireConfigured = process.argv.includes("--require-configured");

if (!redisUrl || !redisToken || !hashSecret) {
  const message =
    "UPSTASH DISTRIBUTED RATE LIMIT: NOT TESTABLE (credentials are not configured).";
  console.log(message);
  if (process.env.GITHUB_ACTIONS === "true") {
    console.log(`::warning title=Upstash verification::${message}`);
  }
  if (requireConfigured) {
    console.error(
      "REQUIRED CLOUD VERIFICATION: FAIL (NOT TESTABLE is not accepted).",
    );
    process.exit(2);
  }
  process.exit(0);
}

const prefix = `restaurant:verification:${randomUUID()}`;
const ratelimit = new Ratelimit({
  redis: new Redis({ url: redisUrl, token: redisToken }),
  limiter: Ratelimit.slidingWindow(2, "1 s"),
  prefix,
  analytics: false,
  ephemeralCache: false,
  timeout: 3_000,
});

function identifier(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function verifyDistributedRateLimit(secret: string) {
  const firstUser = identifier(randomUUID(), secret);
  const secondUser = identifier(randomUUID(), secret);

  const first = await ratelimit.limit(firstUser);
  const second = await ratelimit.limit(firstUser);
  const aboveLimit = await ratelimit.limit(firstUser);
  const isolatedUser = await ratelimit.limit(secondUser);

  assert(first.success && second.success, "Requests within the limit failed.");
  assert(!aboveLimit.success, "The request above the limit was accepted.");
  assert(isolatedUser.success, "A second identifier was not isolated.");

  const waitMilliseconds = Math.max(0, aboveLimit.reset - Date.now()) + 150;
  await new Promise((resolve) => setTimeout(resolve, waitMilliseconds));
  const afterWindow = await ratelimit.limit(firstUser);
  assert(afterWindow.success, "The identifier did not recover after the window.");

  console.log(
    "UPSTASH DISTRIBUTED RATE LIMIT: PASS (within, above, reset, and isolation).",
  );
}

verifyDistributedRateLimit(hashSecret).catch((error: unknown) => {
  console.error(
    "UPSTASH DISTRIBUTED RATE LIMIT: FAIL",
    error instanceof Error ? error.message : "Unknown error",
  );
  process.exitCode = 1;
});
