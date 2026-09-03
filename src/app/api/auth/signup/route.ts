import { NextResponse } from "next/server";
import { signupUser } from "@/server/signupUser";
import {
  SignupInputError,
  SignupUnavailableError,
} from "@/lib/signupErrors";
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
    if (error instanceof SignupInputError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: "Invalid signup request." },
        { status: 400 },
      );
    }
    if (error instanceof SignupUnavailableError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      );
    }
    console.error("Signup endpoint failed.", {
      errorType: error instanceof Error ? error.constructor.name : "UnknownError",
    });
    return NextResponse.json(
      {
        success: false,
        error: "Unable to create an account right now. Please try again.",
      },
      { status: 500 },
    );
  }
}

