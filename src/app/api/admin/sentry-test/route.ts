import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  enforceRateLimit,
  RateLimitExceededError,
  RateLimitUnavailableError,
} from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isStagingEnvironment() {
  return (
    process.env.VERCEL_ENV === "preview" ||
    process.env.SENTRY_ENVIRONMENT === "staging"
  );
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (!user.hasAdminAccess) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  try {
    await enforceRateLimit({
      policy: "admin-user",
      identifier: user.id,
      failurePolicy: "closed",
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json(
        { error: error.message },
        {
          status: 429,
          headers: { "Retry-After": String(error.retryAfterSeconds) },
        },
      );
    }
    if (error instanceof RateLimitUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    throw error;
  }

  if (!isStagingEnvironment()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)) {
    return NextResponse.json(
      { error: "Staging error monitoring is not configured." },
      { status: 503 },
    );
  }

  const eventId = Sentry.captureException(
    new Error("Controlled staging Sentry verification event"),
    { tags: { verification: "staging-admin" } },
  );
  const delivered = await Sentry.flush(2_000);

  return NextResponse.json(
    { captured: delivered, eventId },
    {
      status: delivered ? 202 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
