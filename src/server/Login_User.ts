"use server";

import prisma from "@/lib/prisma";
import { compare, hash } from "bcrypt";
import { z } from "zod";
import { isSuperAdminEmail, setAuthSession } from "@/lib/auth";
import { emailSchema, validationMessage } from "@/lib/validation";

type LoginResult =
  | {
      success: true;
      user: {
        id: string;
        name: string | null;
        email: string;
        isAdmin: boolean;
        isSuperAdmin: boolean;
        isBanned: boolean;
      };
    }
  | { success: false; error: string };

export async function Login_User(data: { email: string; password: string }) {
  const parsed = z
    .object({
      email: emailSchema,
      password: z.string().min(1, "Password is required.").max(72),
    })
    .safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: validationMessage(parsed.error),
    } satisfies LoginResult;
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
  });

  if (!user?.email || !user.password) {
    return {
      success: false,
      error: "Invalid email or password.",
    } satisfies LoginResult;
  }

  if (user.isBanned) {
    return {
      success: false,
      error: "This account is banned. Please contact the admin.",
    } satisfies LoginResult;
  }

  const savedPassword = user.password.trim();
  const passwordMatches = savedPassword.startsWith("$2")
    ? await compare(password, savedPassword)
    : savedPassword === password;

  if (!passwordMatches) {
    return {
      success: false,
      error: "Invalid email or password.",
    } satisfies LoginResult;
  }

  if (!savedPassword.startsWith("$2")) {
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await hash(password, 12), confirm_password: null },
    });
  }

  await setAuthSession(user.id);

  const isSuperAdmin = isSuperAdminEmail(user.email);
  const isAdmin = user.isAdmin || isSuperAdmin;

  return {
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin,
      isSuperAdmin,
      isBanned: user.isBanned,
    },
  } satisfies LoginResult;
}
