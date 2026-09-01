"use server";

import prisma from "@/lib/prisma";
import { hash } from "bcrypt";
import { z } from "zod";
import {
  emailSchema,
  passwordSchema,
  validationMessage,
} from "@/lib/validation";
import {
  enforceRateLimit,
  requestIpAddress,
} from "@/lib/rateLimit";

export async function signupUser(data: {
  name: string;
  email: string;
  password: string;
  confirm_password?: string;
  confirm_pas?: string;
}) {
  try {
    await enforceRateLimit({
      policy: "signup-ip",
      identifier: await requestIpAddress(),
      failurePolicy: "closed",
    });
    const confirmPassword = data.confirm_password || data.confirm_pas || "";
    const parsed = z
      .object({
        name: z
          .string()
          .trim()
          .min(2, "Name must be at least 2 characters.")
          .max(100),
        email: emailSchema.transform((value) => value.toLowerCase()),
        password: passwordSchema,
      })
      .safeParse({
        name: data.name,
        email: data.email,
        password: data.password,
      });
    if (!parsed.success) throw new Error(validationMessage(parsed.error));
    const { name, email, password } = parsed.data;

    if (password !== confirmPassword) {
      throw new Error("Passwords do not match.");
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      throw new Error("Email already exists.");
    }

    const passwordHash = await hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: passwordHash,
        isAdmin: false,
      },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
    };
  } catch (err) {
    console.log("Signup error:", err);
    throw err;
  }
}
