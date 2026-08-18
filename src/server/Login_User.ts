"use server";

import prisma from "@/lib/prisma";
import { compare, hash } from "bcrypt";
import { z } from "zod";
import { isSuperAdminEmail, setAuthSession } from "@/lib/auth";
import { emailSchema, validationMessage } from "@/lib/validation";

export async function Login_User(data: { email: string; password: string }) {
  try {
    const parsed = z
      .object({
        email: emailSchema,
        password: z.string().min(1, "Password is required.").max(72),
      })
      .safeParse(data);
    if (!parsed.success) throw new Error(validationMessage(parsed.error));
    const { email, password } = parsed.data;

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
    });

    if (!user) {
      throw new Error("User not found. Please check the email.");
    }

    if (user.isBanned) {
      throw new Error("This account is banned. Please contact the admin.");
    }

    if (!user.password) {
      throw new Error(
        "This user exists, but no password is saved for this account.",
      );
    }

    const savedPassword = user.password.trim();
    const passwordMatches = savedPassword.startsWith("$2")
      ? await compare(password, savedPassword)
      : savedPassword === password;

    if (!passwordMatches) {
      throw new Error("Incorrect password.");
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
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin,
      isSuperAdmin,
      isBanned: user.isBanned,
    };
  } catch (err) {
    console.log("Login error:", err);
    throw err;
  }
}
