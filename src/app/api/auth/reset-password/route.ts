import { NextResponse } from "next/server";
import {
  RateLimitExceededError,
  RateLimitUnavailableError,
} from "@/lib/rateLimit";
import {
  PASSWORD_RESET_INVALID_MESSAGE,
  resetPasswordForRequest,
} from "@/server/passwordRecoveryService";

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 8_192) {
      return NextResponse.json(
        { success: false, message: PASSWORD_RESET_INVALID_MESSAGE },
        { status: 413 },
      );
    }
    const result = await resetPasswordForRequest(await request.json());
    const response = NextResponse.json(result, {
      status: result.success ? 200 : 400,
      headers: { "Cache-Control": "no-store" },
    });
    if (result.success) response.cookies.delete("restaurant_session");
    return response;
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
    console.error("Password reset attempt failed.", {
      errorType: error instanceof Error ? error.constructor.name : "UnknownError",
    });
    return NextResponse.json(
      { success: false, message: PASSWORD_RESET_INVALID_MESSAGE },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
