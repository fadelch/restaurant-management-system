import { NextResponse } from "next/server";
import { Login_User } from "@/server/Login_User";
import {
  RateLimitExceededError,
  RateLimitUnavailableError,
} from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 4_096) {
      return NextResponse.json(
        { success: false, error: "Invalid login request." },
        { status: 413 },
      );
    }
    const body = await request.json();
    const result = await Login_User(body);
    return NextResponse.json(result, { status: result.success ? 200 : 401 });
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
    console.error("Login endpoint failed.", {
      errorType:
        error instanceof Error ? error.constructor.name : "UnknownError",
    });
    return NextResponse.json(
      { success: false, error: "Invalid email or password." },
      { status: 500 },
    );
  }
}

