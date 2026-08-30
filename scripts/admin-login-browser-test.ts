import { loadEnvConfig } from "@next/env";
import { hash } from "bcrypt";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

loadEnvConfig(process.cwd());

const baseUrl = (process.argv[2] || "http://localhost:3101").replace(/\/$/, "");

function runBrowserProbe(email: string, password: string) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["scripts/browser-health-check.mjs", baseUrl],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          SMOKE_LOGIN_EMAIL: email,
          SMOKE_LOGIN_PASSWORD: password,
        },
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || `Browser probe exited with code ${code}.`));
    });
  });
}

async function main() {
  const { default: prisma } = await import("../src/lib/prisma");
  const suffix = randomUUID();
  const email = `login-browser-admin-${suffix}@example.invalid`;
  const password = `Browser!${randomUUID()}9`;
  const admin = await prisma.user.create({
    data: {
      name: "Login browser admin",
      email,
      password: await hash(password, 12),
      isAdmin: true,
    },
    select: { id: true },
  });

  try {
    const report = JSON.parse(await runBrowserProbe(email, password));
    const labels = [
      "valid-login",
      "admin-authenticated-refresh",
      "logout",
      "valid-login-again",
    ];
    const pages = report.pages.filter((page: { label: string }) =>
      labels.includes(page.label),
    );
    const byLabel = new Map(
      pages.map((page: { label: string }) => [page.label, page]),
    );
    const firstLogin = byLabel.get("valid-login") as
      | { submitted: boolean; url: string; console: unknown[] }
      | undefined;
    const refresh = byLabel.get("admin-authenticated-refresh") as
      | { finalUrl: string; console: unknown[]; hasRuntimeError: boolean }
      | undefined;
    const logout = byLabel.get("logout") as
      | { clicked: boolean; url: string; console: unknown[] }
      | undefined;
    const secondLogin = byLabel.get("valid-login-again") as
      | { submitted: boolean; url: string; console: unknown[] }
      | undefined;
    const passed = Boolean(
      firstLogin?.submitted &&
        new URL(firstLogin.url).pathname === "/Admin" &&
        firstLogin.console.length === 0 &&
        refresh &&
        new URL(refresh.finalUrl).pathname === "/Admin" &&
        !refresh.hasRuntimeError &&
        refresh.console.length === 0 &&
        logout?.clicked &&
        new URL(logout.url).pathname === "/" &&
        logout.console.length === 0 &&
        secondLogin?.submitted &&
        new URL(secondLogin.url).pathname === "/Admin" &&
        secondLogin.console.length === 0,
    );

    console.log(
      JSON.stringify(
        {
          status: passed ? "PASS" : "FAIL",
          flows: pages.map((page: { label: string; url?: string; finalUrl?: string }) => ({
            label: page.label,
            url: page.url || page.finalUrl,
            clicked: "clicked" in page ? page.clicked : undefined,
            submitted: "submitted" in page ? page.submitted : undefined,
            consoleEntries: "console" in page && Array.isArray(page.console)
              ? page.console.length
              : undefined,
          })),
        },
        null,
        2,
      ),
    );
    if (!passed) process.exitCode = 1;
  } finally {
    await prisma.user.deleteMany({ where: { id: admin.id } });
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Login browser probe failed.");
  process.exitCode = 1;
});
