import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "restaurant_session";

function contentSecurityPolicy(nonce: string) {
  const development = process.env.NODE_ENV !== "production";
  const trustedStyleSources =
    `'self' 'nonce-${nonce}' ` +
    `'sha256-Z5XTK23DFuEMs0PwnyZDO9SWxemQ5HxcpVaBNuUJyWY='`;
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    `style-src ${trustedStyleSources}`,
    // Next 15's development overlay injects styles into its shadow DOM without
    // propagating the request nonce. Keep this exception dev-only and limited
    // to <style>/<link>; production style elements still require nonce/hash.
    `style-src-elem ${development ? "'self' 'unsafe-inline'" : trustedStyleSources}`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
    "font-src 'self' data:",
    `connect-src 'self' https://*.ingest.sentry.io https://*.ingest.us.sentry.io${development ? " ws: wss:" : ""}`,
    "media-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    ...(development ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

function applySecurityHeaders(
  request: NextRequest,
  response: NextResponse,
  policy: string,
) {
  response.headers.set("Content-Security-Policy", policy);
  if (
    process.env.NODE_ENV === "production" &&
    request.nextUrl.protocol === "https:"
  ) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
  return response;
}

function base64UrlBytes(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function constantTimeEqual(first: Uint8Array, second: Uint8Array) {
  if (first.length !== second.length) return false;
  let difference = 0;
  for (let index = 0; index < first.length; index += 1) {
    difference |= first[index] ^ second[index];
  }
  return difference === 0;
}

async function hasValidSession(token?: string) {
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret || secret.length < 32) return false;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const expected = new Uint8Array(
      await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded)),
    );
    if (!constantTimeEqual(expected, base64UrlBytes(signature))) return false;

    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlBytes(encoded)),
    ) as { userId?: unknown; expiresAt?: unknown };
    return (
      typeof payload.userId === "string" &&
      typeof payload.expiresAt === "number" &&
      payload.expiresAt > Date.now()
    );
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const policy = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);
  const protectedAdminRoute =
    request.nextUrl.pathname.startsWith("/Admin") ||
    request.nextUrl.pathname.startsWith("/DeleteUser");

  if (!protectedAdminRoute) {
    return applySecurityHeaders(
      request,
      NextResponse.next({ request: { headers: requestHeaders } }),
      policy,
    );
  }

  const validSession = await hasValidSession(
    request.cookies.get(SESSION_COOKIE)?.value,
  );
  if (validSession) {
    return applySecurityHeaders(
      request,
      NextResponse.next({ request: { headers: requestHeaders } }),
      policy,
    );
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return applySecurityHeaders(
    request,
    NextResponse.redirect(loginUrl),
    policy,
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
