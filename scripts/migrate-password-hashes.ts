import { loadEnvConfig } from "@next/env";
import { hash } from "bcrypt";
import { PrismaClient } from "../src/generated/prisma/client";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();
const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const applyMigration = process.argv.includes("--apply");

async function auditPasswordHashes() {
  const users = await prisma.user.findMany({
    select: { id: true, password: true, confirm_password: true },
  });
  const missingPasswordRecords = users.filter(
    (user) => user.password === null,
  ).length;
  const legacyUsers = users.filter(
    (user): user is typeof user & { password: string } =>
      typeof user.password === "string" && !BCRYPT_HASH.test(user.password),
  );
  const confirmationPasswordRecords = users.filter(
    (user) => user.confirm_password !== null,
  ).length;

  console.log(
    JSON.stringify({
      totalUsers: users.length,
      legacyPasswordRecords: legacyUsers.length,
      missingPasswordRecords,
      confirmationPasswordRecords,
      mode: applyMigration ? "migration" : "audit",
    }),
  );

  if (!applyMigration) return;

  let migrated = 0;
  for (const user of legacyUsers) {
    const passwordHash = await hash(user.password, 12);
    const result = await prisma.user.updateMany({
      where: { id: user.id, password: user.password },
      data: { password: passwordHash },
    });
    migrated += result.count;
  }

  const clearedConfirmationPasswords = confirmationPasswordRecords
    ? (
        await prisma.user.updateMany({
          where: { confirm_password: { not: null } },
          data: { confirm_password: null },
        })
      ).count
    : 0;

  const remaining = await prisma.user.findMany({
    select: { password: true, confirm_password: true },
  });
  const remainingLegacyRecords = remaining.filter(
    (user) =>
      typeof user.password === "string" && !BCRYPT_HASH.test(user.password),
  ).length;
  const remainingMissingPasswordRecords = remaining.filter(
    (user) => user.password === null,
  ).length;
  const remainingConfirmationPasswordRecords = remaining.filter(
    (user) => user.confirm_password !== null,
  ).length;

  console.log(
    JSON.stringify({
      migrated,
      clearedConfirmationPasswords,
      remainingLegacyRecords,
      remainingMissingPasswordRecords,
      remainingConfirmationPasswordRecords,
    }),
  );
  if (
    remainingLegacyRecords > 0 ||
    remainingMissingPasswordRecords > 0 ||
    remainingConfirmationPasswordRecords > 0
  ) {
    process.exitCode = 1;
  }
}

auditPasswordHashes()
  .catch((error: unknown) => {
    console.error(
      "Password hash audit failed.",
      error instanceof Error ? error.constructor.name : "UnknownError",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
