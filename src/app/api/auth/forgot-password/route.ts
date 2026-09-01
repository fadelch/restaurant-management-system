import { NextResponse } from "next/server";
import {
  RateLimitExceededError,
  RateLimitUnavailableError,
} from "@/lib/rateLimit";
import {
  PASSWORD_RESET_GENERIC_MESSAGE,
  requestPasswordResetForRequest,
} from "@/server/passwordRecoveryService";

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 4_096) {
      return NextResponse.json(
        { success: true, message: PASSWORD_RESET_GENERIC_MESSAGE },
        { status: 200 },
      );
    }
    const result = await requestPasswordResetForRequest(await request.json());
    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json(
        { success: false, message: error.message },
        {
          status: 429,
          headers: { "Retry-After": String(error.retryAfterSeconds) },
        },
      );
    }
    if (error instanceof RateLimitUnavailableError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 503 },
      );
    }
    console.error("Password reset request failed.", {
      errorType: error instanceof Error ? error.constructor.name : "UnknownError",
    });
    return NextResponse.json(
      { success: true, message: PASSWORD_RESET_GENERIC_MESSAGE },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}
