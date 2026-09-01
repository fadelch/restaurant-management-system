import prisma from "../src/lib/prisma";

type Verification = {
  userRows: number;
  invalidSessionVersionRows: number;
  resetTokenRows: number;
  confirmPasswordColumns: number;
  resetTableColumns: number;
  resetTableIndexes: number;
};

async function main() {
  const [verification] = await prisma.$queryRaw<Verification[]>`
    SELECT
      (SELECT COUNT(*)::int FROM "public"."User") AS "userRows",
      (SELECT COUNT(*)::int FROM "public"."User" WHERE "sessionVersion" < 0) AS "invalidSessionVersionRows",
      (SELECT COUNT(*)::int FROM "public"."PasswordResetToken") AS "resetTokenRows",
      (SELECT COUNT(*)::int FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'confirm_password') AS "confirmPasswordColumns",
      (SELECT COUNT(*)::int FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'PasswordResetToken') AS "resetTableColumns",
      (SELECT COUNT(*)::int FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'PasswordResetToken') AS "resetTableIndexes"
  `;
  if (!verification) throw new Error("Recovery schema verification returned no rows.");
  const passed =
    verification.invalidSessionVersionRows === 0 &&
    verification.resetTokenRows === 0 &&
    verification.confirmPasswordColumns === 0 &&
    verification.resetTableColumns === 6 &&
    verification.resetTableIndexes === 4;
  if (!passed) {
    throw new Error(`Recovery schema verification failed: ${JSON.stringify(verification)}`);
  }
  console.log(JSON.stringify({ status: "PASS", verification }, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error(
      "PASSWORD RECOVERY MIGRATION: FAIL",
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
