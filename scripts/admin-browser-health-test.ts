import { loadEnvConfig } from "@next/env";
import { hash } from "bcrypt";
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

loadEnvConfig(process.cwd());

const baseUrl = (process.argv[2] || "http://localhost:3100").replace(/\/$/, "");
const adminRoutes = [
  "/Admin",
  "/Admin/analytics",
  "/Admin/inventory",
  "/Admin/operations",
  "/Admin/announcements",
  "/Admin/audit-logs",
];

function requiredSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be configured with at least 32 characters.");
  }
  return secret;
}

function sessionToken(userId: string) {
  const encoded = Buffer.from(
    JSON.stringify({
      userId,
      expiresAt: Date.now() + 10 * 60 * 1000,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", requiredSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

function runBrowserProbe(token: string, email: string) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["scripts/browser-health-check.mjs", baseUrl],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          SMOKE_SESSION_COOKIE: token,
          SMOKE_USER_EMAIL: email,
          SMOKE_EXTRA_ROUTES: JSON.stringify(adminRoutes),
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
  const email = `browser-admin-${suffix}@example.invalid`;
  const admin = await prisma.user.create({
    data: {
      name: "Browser health admin",
      email,
      password: await hash(randomUUID(), 12),
      isAdmin: true,
    },
    select: { id: true },
  });

  try {
    const report = JSON.parse(await runBrowserProbe(sessionToken(admin.id), email));
    const testedPages = report.pages.filter(
      (page: { label: string }) =>
        page.label === "admin-unauthenticated" || page.label.startsWith("extra:/Admin"),
    );
    const consoleEntries = testedPages.flatMap(
      (page: { label: string; console?: unknown[] }) =>
        (page.console || []).map((entry) => ({ page: page.label, entry })),
    );
    const result = {
      extensionsDisabled: report.extensionsDisabled === true,
      routesVisited: testedPages.map(
        (page: {
          label: string;
          finalUrl: string;
          hasRuntimeError: boolean;
          brokenImages: unknown[];
        }) => ({
          label: page.label,
          finalUrl: page.finalUrl,
          hasRuntimeError: page.hasRuntimeError,
          brokenImages: page.brokenImages.length,
        }),
      ),
      consoleEntries,
      imageSizingWarning: consoleEntries.some(({ entry }: { entry: unknown }) =>
        JSON.stringify(entry).includes("has either width or height modified"),
      ),
      startTimeException: consoleEntries.some(({ entry }: { entry: unknown }) =>
        JSON.stringify(entry).includes("reading 'startTime'"),
      ),
      cspViolation: consoleEntries.some(({ entry }: { entry: unknown }) =>
        JSON.stringify(entry).includes("Content Security Policy"),
      ),
    };
    const passed =
      testedPages.length === adminRoutes.length + 1 &&
      testedPages.every(
        (page: {
          finalUrl: string;
          hasRuntimeError: boolean;
          brokenImages: unknown[];
        }) =>
          new URL(page.finalUrl).pathname.startsWith("/Admin") &&
          !page.hasRuntimeError &&
          page.brokenImages.length === 0,
      ) &&
      consoleEntries.length === 0;

    console.log(JSON.stringify({ status: passed ? "PASS" : "FAIL", ...result }, null, 2));
    if (!passed) process.exitCode = 1;
  } finally {
    await prisma.user.deleteMany({ where: { id: admin.id } });
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Admin browser probe failed.");
  process.exitCode = 1;
});
