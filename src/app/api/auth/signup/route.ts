import { NextResponse } from "next/server";
import { signupUser } from "@/server/signupUser";
import {
  RateLimitExceededError,
  RateLimitUnavailableError,
} from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 8_192) {
      return NextResponse.json(
        { success: false, error: "Invalid signup request." },
        { status: 413 },
      );
    }
    const user = await signupUser(await request.json());
    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json(
        { success: false, error: error.message },
        {
          status: 429,
          headers: { "Retry-After": String(error.retryAfterSeconds) },
        },
      );
    }
    if (error instanceof RateLimitUnavailableError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 503 },
      );
    }
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create an account with these details.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 },
    );
  }
}

