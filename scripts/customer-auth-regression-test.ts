import { randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import prisma from "../src/lib/prisma";
import { getUserFromAuthSessionToken } from "../src/lib/auth";

const port = 3104;
const baseUrl = `http://127.0.0.1:${port}`;

async function waitForServer(process: ChildProcess) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) throw new Error("Development server exited early.");
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error("Timed out waiting for the development server.");
}

async function stopServer(process: ChildProcess) {
  if (process.exitCode !== null) return;
  process.kill("SIGTERM");
  await Promise.race([
    new Promise<void>((resolve) => process.once("exit", () => resolve())),
    new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (process.exitCode === null) process.kill("SIGKILL");
}

function sessionCookie(response: Response) {
  const header = response.headers.get("set-cookie") || "";
  return /restaurant_session=([^;]+)/.exec(header)?.[1] || "";
}

async function main() {
  const suffix = randomUUID();
  const email = `customer-auth-${suffix}@example.test`;
  const password = "Customer!Password9";
  const nextBin = path.join(
    process.cwd(),
    "node_modules",
    "next",
    "dist",
    "bin",
    "next",
  );
  const server = spawn(
    process.execPath,
    [nextBin, "dev", "--turbopack", "-p", String(port)],
    {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: "development" },
      stdio: ["ignore", "ignore", "ignore"],
      windowsHide: true,
    },
  );

  try {
    await waitForServer(server);
    const postJson = (path: string, body: unknown) =>
      fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    const [invalidEmail, weakPassword, passwordMismatch, emptyFields, nullBody] =
      await Promise.all([
        postJson("/api/auth/signup", {
          name: "Invalid Email",
          email: "not-an-email",
          password,
          confirm_password: password,
        }),
        postJson("/api/auth/signup", {
          name: "Weak Password",
          email: `weak-${suffix}@example.test`,
          password: "weak",
          confirm_password: "weak",
        }),
        postJson("/api/auth/signup", {
          name: "Password Mismatch",
          email: `mismatch-${suffix}@example.test`,
          password,
          confirm_password: `${password}!different`,
        }),
        postJson("/api/auth/signup", {}),
        postJson("/api/auth/signup", null),
      ]);
    const malformedJson = await fetch(`${baseUrl}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-json",
    });
    const oversized = await postJson("/api/auth/signup", {
      name: "x".repeat(9_000),
      email: `oversized-${suffix}@example.test`,
      password,
      confirm_password: password,
    });
    const signup = await fetch(`${baseUrl}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Customer Auth Regression",
        email: `  ${email.toUpperCase()}  `,
        password,
        confirm_password: password,
      }),
    });
    const signupBody = (await signup.json()) as { success?: boolean };
    if (signup.status !== 201 || !signupBody.success) {
      throw new Error("Normal customer signup failed.");
    }

    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const loginBody = (await login.json()) as {
      success?: boolean;
      user?: { isAdmin?: boolean; isSuperAdmin?: boolean };
    };
    const cookie = sessionCookie(login);
    const sessionUser = await getUserFromAuthSessionToken(cookie);
    const created = await prisma.user.findUniqueOrThrow({ where: { email } });
    const duplicateSignup = await postJson("/api/auth/signup", {
      name: "Duplicate Customer",
      email,
      password,
      confirm_password: password,
    });
    const invalidPasswordLogin = await postJson("/api/auth/login", {
      email,
      password: `${password}!wrong`,
    });
    const unknownAccountLogin = await postJson("/api/auth/login", {
      email: `unknown-login-${suffix}@example.test`,
      password,
    });
    const invalidPasswordBody = (await invalidPasswordLogin.json()) as {
      error?: string;
    };
    const unknownAccountBody = (await unknownAccountLogin.json()) as {
      error?: string;
    };

    const knownRecovery = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const unknownRecovery = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `unknown-${suffix}@example.test` }),
    });
    const knownRecoveryBody = (await knownRecovery.json()) as { message?: string };
    const unknownRecoveryBody = (await unknownRecovery.json()) as { message?: string };

    await prisma.user.update({
      where: { id: created.id },
      data: { isBanned: true },
    });
    const bannedLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    await prisma.user.update({
      where: { id: created.id },
      data: { isBanned: false, deletedAt: new Date() },
    });
    const deletedLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const results = {
      normalSignup: signup.status === 201 && signupBody.success === true,
      invalidEmailRejected: invalidEmail.status === 400,
      weakPasswordRejected: weakPassword.status === 400,
      passwordMismatchRejected: passwordMismatch.status === 400,
      emptyFieldsRejected: emptyFields.status === 400,
      nullBodyRejected: nullBody.status === 400,
      malformedJsonRejected: malformedJson.status === 400,
      oversizedBodyRejected: oversized.status === 413,
      duplicateEmailRejected: duplicateSignup.status === 400,
      emailNormalized: created.email === email,
      passwordHashed: Boolean(created.password?.startsWith("$2")),
      normalLogin:
        login.status === 200 &&
        loginBody.success === true &&
        Boolean(cookie) &&
        sessionUser?.id === created.id,
      customerRolePreserved:
        loginBody.user?.isAdmin === false &&
        loginBody.user?.isSuperAdmin === false &&
        created.isAdmin === false,
      loginFailuresIndistinguishable:
        invalidPasswordLogin.status === 401 &&
        unknownAccountLogin.status === 401 &&
        invalidPasswordBody.error === unknownAccountBody.error,
      recoveryResponseDoesNotEnumerate:
        knownRecovery.status === 200 &&
        unknownRecovery.status === 200 &&
        knownRecoveryBody.message === unknownRecoveryBody.message,
      unconfiguredEmailLeavesNoToken:
        (await prisma.passwordResetToken.count({
          where: { userId: created.id },
        })) === 0,
      bannedUserDenied: bannedLogin.status === 401,
      deletedUserDenied: deletedLogin.status === 401,
    };
    if (!Object.values(results).every(Boolean)) {
      throw new Error(`Customer auth regression failed: ${JSON.stringify(results)}`);
    }
    console.log(JSON.stringify({ status: "PASS", results }, null, 2));
  } finally {
    await stopServer(server);
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    "CUSTOMER AUTH REGRESSION: FAIL",
    error instanceof Error ? error.message : "Unknown error",
  );
  process.exitCode = 1;
});
