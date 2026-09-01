import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";
import {
  assertAdminAccess,
  assertSuperAdminAccess,
} from "@/lib/authorization";
import { isAccountDisabled } from "@/lib/accountStatus";

const SESSION_COOKIE = "restaurant_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

const sessionPayloadSchema = z.object({
  userId: z.string().uuid(),
  expiresAt: z.number().int().positive(),
  sessionVersion: z.number().int().nonnegative().default(0),
});

type SessionPayload = z.infer<typeof sessionPayloadSchema>;

function sessionSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured.");
  if (secret.length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 characters.");
  }
  return secret;
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret())
    .update(value)
    .digest("base64url");
}

function encodeSession(payload: SessionPayload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function createAuthSessionToken(
  userId: string,
  sessionVersion: number,
  expiresAt = Date.now() + SESSION_DURATION_SECONDS * 1000,
) {
  return encodeSession({ userId, sessionVersion, expiresAt });
}

function decodeSession(token?: string): SessionPayload | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = sessionPayloadSchema.safeParse(
      JSON.parse(Buffer.from(encoded, "base64url").toString()),
    );
    if (!payload.success || payload.data.expiresAt <= Date.now()) return null;
    return payload.data;
  } catch {
    return null;
  }
}

export function isSuperAdminEmail(email?: string | null) {
  return Boolean(
    email &&
    process.env.SUPER_ADMIN_EMAIL &&
    email.toLowerCase() === process.env.SUPER_ADMIN_EMAIL.toLowerCase(),
  );
}

export async function setAuthSession(userId: string, sessionVersion: number) {
  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE,
    createAuthSessionToken(userId, sessionVersion),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    },
  );
}

export async function clearAuthSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  return getUserFromAuthSessionToken(
    cookieStore.get(SESSION_COOKIE)?.value,
  );
}

export async function getUserFromAuthSessionToken(token?: string) {
  const payload = decodeSession(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      name: true,
      email: true,
      isAdmin: true,
      isBanned: true,
      createdAt: true,
      deletedAt: true,
      sessionVersion: true,
    },
  });
  if (
    !user ||
    isAccountDisabled(user) ||
    user.sessionVersion !== payload.sessionVersion
  )
    return null;

  const isSuperAdmin = isSuperAdminEmail(user.email);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    isBanned: user.isBanned,
    createdAt: user.createdAt,
    deletedAt: user.deletedAt,
    isSuperAdmin,
    hasAdminAccess: user.isAdmin || isSuperAdmin,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("You must be logged in.");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  assertAdminAccess(user);
  return user;
}

export async function requireSuperAdmin() {
  const user = await requireAdmin();
  assertSuperAdminAccess(user);
  return user;
}

export async function requireRateLimitedAdmin() {
  const user = await requireAdmin();
  await enforceRateLimit({
    policy: "admin-user",
    identifier: user.id,
    failurePolicy: "closed",
  });
  return user;
}

export async function requireRateLimitedSuperAdmin() {
  const user = await requireSuperAdmin();
  await enforceRateLimit({
    policy: "admin-user",
    identifier: user.id,
    failurePolicy: "closed",
  });
  return user;
}
