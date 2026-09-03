import { spawnSync } from "node:child_process";

const checks = [
  ["Prisma schema validation", "npx", ["prisma", "validate"]],
  ["Prisma client generation", "npx", ["prisma", "generate"]],
  ["TypeScript", "npx", ["tsc", "--noEmit"]],
  ["ESLint", "npm", ["run", "lint"]],
  ["Unit tests", "npm", ["test"]],
  ["Data-integrity tests", "npm", ["run", "test:data-integrity"]],
  ["Financial tests", "npm", ["run", "test:financial"]],
  ["Checkout/concurrency tests", "npm", ["run", "test:checkout"]],
  [
    "Password-recovery tests",
    "npm",
    ["run", "test:password-recovery"],
  ],
  ["Customer-auth tests", "npm", ["run", "test:customer-auth"]],
  ["Business-configuration tests", "npm", ["run", "test:business-config"]],
  ["Customer launch configuration status", "npm", ["run", "check:launch-config"]],
  ["Production build", "npm", ["run", "build"]],
  ["Authorization tests", "npm", ["run", "test:authorization"]],
];

for (const [label, command, args] of checks) {
  console.log(`\n=== ${label} ===`);
  const windows = process.platform === "win32";
  const result = spawnSync(
    windows ? process.env.ComSpec || "cmd.exe" : command,
    windows ? ["/d", "/s", "/c", `${command} ${args.join(" ")}`] : args,
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    },
  );
  if (result.error) {
    console.error(`${label}: FAIL`, result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`${label}: FAIL (exit ${result.status ?? "unknown"})`);
    process.exit(result.status || 1);
  }
}

console.log("\nLOCAL RELEASE CHECKS: PASS");
console.log(
  "CLOUD VERIFICATION: NOT RUN (Upstash, Resend, Sentry, Blob, Neon staging, and hosting remain separate).",
);
