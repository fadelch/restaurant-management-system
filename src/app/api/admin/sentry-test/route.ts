import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { requireRateLimitedAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isStagingEnvironment() {
  return (
    process.env.VERCEL_ENV === "preview" ||
    process.env.SENTRY_ENVIRONMENT === "staging"
  );
}

export async function POST() {
  await requireRateLimitedAdmin();

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
