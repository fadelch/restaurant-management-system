import "server-only";

import { hash } from "bcrypt";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { isAccountDisabled } from "@/lib/accountStatus";
import {
  sendPasswordResetEmail,
  type PasswordResetMailer,
} from "@/lib/email";
import {
  enforceRateLimit,
  requestIpAddress,
  type RateLimitInput,
} from "@/lib/rateLimit";
import {
  emailSchema,
  passwordSchema,
} from "@/lib/validation";

export const PASSWORD_RESET_EXPIRY_MINUTES = 30;
export const PASSWORD_RESET_GENERIC_MESSAGE =
  "If an account exists for that email, a reset link has been sent.";
export const PASSWORD_RESET_INVALID_MESSAGE =
  "This reset link is invalid or has expired. Request a new one.";
export const PASSWORD_RESET_SUCCESS_MESSAGE =
  "Your password has been reset. You can now log in with the new password.";

type RecoveryRuntime = {
  now?: () => Date;
  generateToken?: () => string;
  mailer?: PasswordResetMailer;
  requestIp?: () => Promise<string>;
  rateLimit?: (input: RateLimitInput) => Promise<unknown>;
};

const resetInputSchema = z.object({
  token: z.string().trim().min(32).max(512),
  password: passwordSchema,
});

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function tokenIdentifier(value: unknown) {
  return hashPasswordResetToken(
    typeof value === "string" ? value.slice(0, 512) : "invalid-token",
  );
}

async function limit(
  runtime: RecoveryRuntime,
  input: RateLimitInput,
) {
  return (runtime.rateLimit || enforceRateLimit)(input);
}

async function requestIp(runtime: RecoveryRuntime) {
  return (runtime.requestIp || requestIpAddress)();
}

export async function requestPasswordResetForRequest(
  input: { email?: unknown },
  runtime: RecoveryRuntime = {},
) {
  const ip = await requestIp(runtime);
  await limit(runtime, {
    policy: "password-reset-request-ip",
    identifier: ip,
    failurePolicy: "closed",
  });

  const parsedEmail = emailSchema
    .transform((value) => value.toLowerCase())
    .safeParse(input.email);
  const emailIdentifier = parsedEmail.success
    ? parsedEmail.data
    : String(input.email ?? "invalid-email").trim().toLowerCase().slice(0, 254);
  await limit(runtime, {
    policy: "password-reset-request-account",
    identifier: emailIdentifier || "invalid-email",
    failurePolicy: "closed",
  });

  if (!parsedEmail.success) {
    return { success: true, message: PASSWORD_RESET_GENERIC_MESSAGE } as const;
  }

  const user = await prisma.user.findFirst({
    where: {
      email: { equals: parsedEmail.data, mode: "insensitive" },
    },
    select: {
      id: true,
      email: true,
      password: true,
      isBanned: true,
      deletedAt: true,
    },
  });
  if (!user?.email || !user.password || isAccountDisabled(user)) {
    return { success: true, message: PASSWORD_RESET_GENERIC_MESSAGE } as const;
  }

  const now = (runtime.now || (() => new Date()))();
  const rawToken = (runtime.generateToken || (() => randomBytes(32).toString("base64url")))();
  const tokenHash = hashPasswordResetToken(rawToken);
  const expiresAt = new Date(
    now.getTime() + PASSWORD_RESET_EXPIRY_MINUTES * 60_000,
  );

  const createdToken = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "public"."User"
      WHERE "id" = ${user.id}
      FOR UPDATE
    `;
    await tx.passwordResetToken.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: now },
    });
    return tx.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
      select: { id: true },
    });
  });

  let delivered = false;
  try {
    delivered = (
      await (runtime.mailer || sendPasswordResetEmail)({
        to: user.email,
        token: rawToken,
        expiresInMinutes: PASSWORD_RESET_EXPIRY_MINUTES,
      })
    ).delivered;
  } catch (error) {
    console.error("Password reset email delivery failed.", {
      errorType: error instanceof Error ? error.constructor.name : "UnknownError",
    });
  }

  if (!delivered) {
    await prisma.passwordResetToken.deleteMany({
      where: { id: createdToken.id, tokenHash },
    });
  }

  return { success: true, message: PASSWORD_RESET_GENERIC_MESSAGE } as const;
}

export async function resetPasswordForRequest(
  input: { token?: unknown; password?: unknown },
  runtime: RecoveryRuntime = {},
) {
  const ip = await requestIp(runtime);
  await limit(runtime, {
    policy: "password-reset-attempt-ip",
    identifier: ip,
    failurePolicy: "closed",
  });
  await limit(runtime, {
    policy: "password-reset-attempt-token",
    identifier: tokenIdentifier(input.token),
    failurePolicy: "closed",
  });

  const parsed = resetInputSchema.safeParse(input);
  if (!parsed.success) {
    const passwordIssue = parsed.error.issues.find(
      (issue) => issue.path[0] === "password",
    );
    return {
      success: false,
      message: passwordIssue
        ? passwordIssue.message
        : PASSWORD_RESET_INVALID_MESSAGE,
    } as const;
  }

  const now = (runtime.now || (() => new Date()))();
  const tokenHash = hashPasswordResetToken(parsed.data.token);
  const passwordHash = await hash(parsed.data.password, 12);

  const reset = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "public"."PasswordResetToken"
      WHERE "tokenHash" = ${tokenHash}
      FOR UPDATE
    `;
    if (!locked.length) return false;

    const token = await tx.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (
      !token ||
      token.consumedAt ||
      token.expiresAt <= now ||
      !token.user.password ||
      isAccountDisabled(token.user)
    ) {
      return false;
    }

    await tx.user.update({
      where: { id: token.userId },
      data: {
        password: passwordHash,
        sessionVersion: { increment: 1 },
      },
    });
    await tx.passwordResetToken.updateMany({
      where: { userId: token.userId, consumedAt: null },
      data: { consumedAt: now },
    });
    return true;
  });

  return reset
    ? ({ success: true, message: PASSWORD_RESET_SUCCESS_MESSAGE } as const)
    : ({ success: false, message: PASSWORD_RESET_INVALID_MESSAGE } as const);
}
