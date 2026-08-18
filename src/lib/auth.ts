import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

const SESSION_COOKIE = "restaurant_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  userId: string;
  expiresAt: number;
};

function sessionSecret() {
  const secret = process.env.AUTH_SECRET || process.env.DATABASE_URL;
  if (!secret) throw new Error("AUTH_SECRET is not configured.");
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
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString(),
    ) as SessionPayload;
    if (!payload.userId || payload.expiresAt <= Date.now()) return null;
    return payload;
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

export async function setAuthSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE,
    encodeSession({
      userId,
      expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000,
    }),
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
  const payload = decodeSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!payload) return null;

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || user.isBanned) return null;

  const isSuperAdmin = isSuperAdminEmail(user.email);
  return {
    ...user,
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
  if (!user.hasAdminAccess) throw new Error("Admin access is required.");
  return user;
}

export async function requireSuperAdmin() {
  const user = await requireAdmin();
  if (!user.isSuperAdmin) throw new Error("Super Admin access is required.");
  return user;
}
