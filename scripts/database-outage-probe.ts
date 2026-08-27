import { loadEnvConfig } from "@next/env";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";

loadEnvConfig(process.cwd());

const sanitizedCheckoutMessage =
  "We couldn't complete your order right now. Please try again.";

async function outageChild() {
  const { checkoutForAuthenticatedUser } = await import(
    "../src/server/checkoutService"
  );
  let sanitized = false;
  try {
    await checkoutForAuthenticatedUser(
      { id: randomUUID() },
      {
        checkoutRequestId: randomUUID(),
        items: [
          {
            id: randomUUID(),
            cartQty: 1,
            extraCheese: false,
            removedIngredients: [],
            addedIngredientNames: [],
          },
        ],
        customerName: "Database outage probe",
        customerPhone: "+96170000000",
        fulfillmentType: "pickup",
      },
      { restaurantStatus: async () => ({ isOpen: true, message: "Open" }) },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    sanitized =
      message === sanitizedCheckoutMessage &&
      !/prisma|postgres|database_url|127\.0\.0\.1/i.test(message);
  }
  console.log(JSON.stringify({ status: sanitized ? "PASS" : "FAIL" }));
  if (!sanitized) process.exitCode = 1;
}

async function recoveryChild() {
  const { default: prisma } = await import("../src/lib/prisma");
  try {
    const rows = await prisma.$queryRaw<Array<{ available: number }>>`
      SELECT 1 AS "available"
    `;
    const recovered = rows[0]?.available === 1;
    console.log(JSON.stringify({ status: recovered ? "PASS" : "FAIL" }));
    if (!recovered) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

function runChild(mode: "outage" | "recovery", databaseUrl: string) {
  return new Promise<boolean>((resolve, reject) => {
    const tsxCli = path.join(
      process.cwd(),
      "node_modules",
      "tsx",
      "dist",
      "cli.mjs",
    );
    const child = spawn(
      process.execPath,
      [tsxCli, "--conditions=react-server", __filename, `--${mode}`],
      {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: databaseUrl },
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
    let output = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      output += chunk;
    });
    child.once("error", () => reject(new Error(`${mode} probe did not start.`)));
    child.once("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`${mode} probe failed safely.`));
        return;
      }
      try {
        const result = JSON.parse(output.trim()) as { status?: unknown };
        resolve(result.status === "PASS");
      } catch {
        reject(new Error(`${mode} probe returned an invalid result.`));
      }
    });
  });
}

async function parent() {
  const validDatabaseUrl = process.env.DATABASE_URL;
  if (!validDatabaseUrl) throw new Error("DATABASE_URL is not configured.");
  const startedAt = Date.now();
  const outageSanitized = await runChild(
    "outage",
    "postgresql://invalid:invalid@127.0.0.1:1/unavailable?connect_timeout=1",
  );
  const recovered = await runChild("recovery", validDatabaseUrl);
  const passed = outageSanitized && recovered;
  console.log(
    JSON.stringify(
      {
        status: passed ? "PASS" : "FAIL",
        results: {
          outageErrorSanitized: outageSanitized,
          reconnectAfterOutage: recovered,
          elapsedMs: Date.now() - startedAt,
        },
      },
      null,
      2,
    ),
  );
  if (!passed) process.exitCode = 1;
}

const mode = process.argv[2];
const operation =
  mode === "--outage"
    ? outageChild()
    : mode === "--recovery"
      ? recoveryChild()
      : parent();

operation.catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Database outage probe failed.",
  );
  process.exitCode = 1;
});
