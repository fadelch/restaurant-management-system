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
  RateLimitExceededError,
  RateLimitUnavailableError,
  requestIpAddress,
} from "@/lib/rateLimit";
import {
  SignupInputError,
  SignupUnavailableError,
} from "@/lib/signupErrors";

export async function signupUser(data: unknown) {
  try {
    await enforceRateLimit({
      policy: "signup-ip",
      identifier: await requestIpAddress(),
      failurePolicy: "closed",
    });
    const parsed = z
      .object({
        name: z
          .string()
          .trim()
          .min(2, "Name must be at least 2 characters.")
          .max(100),
        email: emailSchema.transform((value) => value.toLowerCase()),
        password: passwordSchema,
        confirm_password: z.string().max(72).optional(),
        confirm_pas: z.string().max(72).optional(),
      })
      .safeParse(data);
    if (!parsed.success) {
      throw new SignupInputError(validationMessage(parsed.error));
    }
    const { name, email, password } = parsed.data;
    const confirmPassword =
      parsed.data.confirm_password || parsed.data.confirm_pas || "";

    if (password !== confirmPassword) {
      throw new SignupInputError("Passwords do not match.");
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      throw new SignupInputError("Email already exists.");
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
    if (
      err instanceof SignupInputError ||
      err instanceof RateLimitExceededError ||
      err instanceof RateLimitUnavailableError
    ) {
      throw err;
    }
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === "P2002"
    ) {
      throw new SignupInputError("Email already exists.");
    }
    console.error("Signup operation failed.", {
      errorType: err instanceof Error ? err.constructor.name : "UnknownError",
      errorCode:
        typeof err === "object" && err !== null && "code" in err
          ? String(err.code)
          : null,
    });
    throw new SignupUnavailableError();
  }
}
