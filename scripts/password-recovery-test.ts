import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { compare, hash } from "bcrypt";
import prisma from "../src/lib/prisma";
import {
  createAuthSessionToken,
  getUserFromAuthSessionToken,
} from "../src/lib/auth";
import {
  RateLimitExceededError,
  type RateLimitInput,
} from "../src/lib/rateLimit";
import {
  PASSWORD_RESET_GENERIC_MESSAGE,
  PASSWORD_RESET_INVALID_MESSAGE,
  hashPasswordResetToken,
  requestPasswordResetForRequest,
  resetPasswordForRequest,
} from "../src/server/passwordRecoveryService";

const runId = randomUUID();
const activeId = randomUUID();
const otherId = randomUUID();
const bannedId = randomUUID();
const deletedId = randomUUID();
const activeEmail = `recovery-active-${runId}@example.test`;
const otherEmail = `recovery-other-${runId}@example.test`;
const oldPassword = "Old!Password9";
const newPassword = "New!Password8";
const baseNow = new Date("2026-09-01T10:00:00.000Z");

type CapturedMail = { to: string; token: string; expiresInMinutes: number };
const results: Record<string, boolean | number | string> = {};

function expect(name: string, condition: boolean) {
  assert.equal(condition, true, name);
  results[name] = true;
}

const noLimit = async () => ({ limited: false });

function runtime(mail: CapturedMail[], now = baseNow) {
  return {
    now: () => now,
    requestIp: async () => "192.0.2.10",
    rateLimit: noLimit,
    generateToken: () => randomBytes(32).toString("base64url"),
    mailer: async (message: CapturedMail) => {
      mail.push(message);
      return { delivered: true };
    },
  };
}

function boundedLimiter() {
  const counts = new Map<string, number>();
  const limits: Partial<Record<RateLimitInput["policy"], number>> = {
    "password-reset-request-ip": 5,
    "password-reset-request-account": 3,
    "password-reset-attempt-ip": 10,
    "password-reset-attempt-token": 5,
  };
  return async (input: RateLimitInput) => {
    const key = `${input.policy}:${input.identifier}`;
    const count = (counts.get(key) || 0) + 1;
    counts.set(key, count);
    if (count > (limits[input.policy] || Number.MAX_SAFE_INTEGER)) {
      throw new RateLimitExceededError(60);
    }
    return { limited: false };
  };
}

async function cleanup() {
  await prisma.passwordResetToken.deleteMany({
    where: { userId: { in: [activeId, otherId, bannedId, deletedId] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [activeId, otherId, bannedId, deletedId] } },
  });
}

async function main() {
  await cleanup();
  const originalHash = await hash(oldPassword, 12);
  try {
    await prisma.user.createMany({
      data: [
        {
          id: activeId,
          name: "Recovery Active",
          email: activeEmail,
          password: originalHash,
        },
        {
          id: otherId,
          name: "Recovery Other",
          email: otherEmail,
          password: originalHash,
        },
        {
          id: bannedId,
          name: "Recovery Banned",
          email: `recovery-banned-${runId}@example.test`,
          password: originalHash,
          isBanned: true,
        },
        {
          id: deletedId,
          name: "Recovery Deleted",
          email: `recovery-deleted-${runId}@example.test`,
          password: originalHash,
          deletedAt: baseNow,
        },
      ],
    });

    const oldSession = createAuthSessionToken(
      activeId,
      0,
      Date.now() + 60 * 60 * 1000,
    );
    expect(
      "existing session is initially valid",
      (await getUserFromAuthSessionToken(oldSession))?.id === activeId,
    );
    const capturedMail: CapturedMail[] = [];
    const capturedLogs: string[] = [];
    const originalLog = console.log;
    const originalError = console.error;
    console.log = (...args: unknown[]) => capturedLogs.push(JSON.stringify(args));
    console.error = (...args: unknown[]) => capturedLogs.push(JSON.stringify(args));
    let knownResponse;
    try {
      knownResponse = await requestPasswordResetForRequest(
        { email: `  ${activeEmail.toUpperCase()}  ` },
        runtime(capturedMail),
      );
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }
    const firstToken = capturedMail[0]?.token;
    assert.ok(firstToken, "Known-account request did not deliver a test token.");

    const unknownResponse = await requestPasswordResetForRequest(
      { email: `recovery-unknown-${runId}@example.test` },
      runtime(capturedMail),
    );
    const invalidEmailResponse = await requestPasswordResetForRequest(
      { email: "not-an-email" },
      runtime(capturedMail),
    );
    expect(
      "known and unknown email responses match",
      knownResponse.message === unknownResponse.message &&
        unknownResponse.message === PASSWORD_RESET_GENERIC_MESSAGE,
    );
    expect(
      "invalid email uses generic response",
      invalidEmailResponse.message === PASSWORD_RESET_GENERIC_MESSAGE,
    );

    const firstStoredToken = await prisma.passwordResetToken.findUniqueOrThrow({
      where: { tokenHash: hashPasswordResetToken(firstToken) },
    });
    expect("raw reset token is not stored", firstStoredToken.tokenHash !== firstToken);
    expect(
      "raw reset token is not logged",
      capturedLogs.every((entry) => !entry.includes(firstToken)),
    );

    await requestPasswordResetForRequest(
      { email: activeEmail },
      runtime(capturedMail),
    );
    const secondToken = capturedMail.at(-1)?.token;
    assert.ok(secondToken, "A replacement reset token was not delivered.");
    const invalidatedFirst = await prisma.passwordResetToken.findUniqueOrThrow({
      where: { tokenHash: hashPasswordResetToken(firstToken) },
    });
    expect("new request invalidates older token", invalidatedFirst.consumedAt !== null);
    const oldTokenAttempt = await resetPasswordForRequest(
      { token: firstToken, password: newPassword },
      runtime(capturedMail),
    );
    expect(
      "invalidated token is rejected",
      !oldTokenAttempt.success && oldTokenAttempt.message === PASSWORD_RESET_INVALID_MESSAGE,
    );

    const otherBefore = await prisma.user.findUniqueOrThrow({
      where: { id: otherId },
      select: { password: true },
    });
    const successfulReset = await resetPasswordForRequest(
      { token: secondToken, password: newPassword },
      runtime(capturedMail),
    );
    expect("known email reset succeeds", successfulReset.success);
    const [activeAfterReset, otherAfter] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: activeId } }),
      prisma.user.findUniqueOrThrow({ where: { id: otherId } }),
    ]);
    assert.ok(activeAfterReset.password);
    expect("new password works", await compare(newPassword, activeAfterReset.password));
    expect("old password no longer works", !(await compare(oldPassword, activeAfterReset.password)));
    expect(
      "reset token cannot reset another user",
      otherAfter.password === otherBefore.password,
    );
    expect(
      "password reset revokes old session",
      (await getUserFromAuthSessionToken(oldSession)) === null,
    );
    const replacementSession = createAuthSessionToken(
      activeId,
      activeAfterReset.sessionVersion,
      Date.now() + 60 * 60 * 1000,
    );
    expect(
      "new session version is accepted",
      (await getUserFromAuthSessionToken(replacementSession))?.id === activeId,
    );

    const replay = await resetPasswordForRequest(
      { token: secondToken, password: "Replay!Password7" },
      runtime(capturedMail),
    );
    expect("used token replay is rejected", !replay.success);

    await requestPasswordResetForRequest(
      { email: activeEmail },
      runtime(capturedMail),
    );
    const concurrentToken = capturedMail.at(-1)?.token;
    assert.ok(concurrentToken);
    const concurrentPassword = "Concurrent!Pass6";
    const concurrentResults = await Promise.all([
      resetPasswordForRequest(
        { token: concurrentToken, password: concurrentPassword },
        runtime(capturedMail),
      ),
      resetPasswordForRequest(
        { token: concurrentToken, password: concurrentPassword },
        runtime(capturedMail),
      ),
    ]);
    expect(
      "concurrent token reuse permits one reset",
      concurrentResults.filter((result) => result.success).length === 1,
    );
    expect(
      "concurrent token reuse rejects replay",
      concurrentResults.filter((result) => !result.success).length === 1,
    );

    await requestPasswordResetForRequest(
      { email: activeEmail },
      runtime(capturedMail, baseNow),
    );
    const expiredToken = capturedMail.at(-1)?.token;
    assert.ok(expiredToken);
    const expiredResult = await resetPasswordForRequest(
      { token: expiredToken, password: "Expired!Password5" },
      runtime(
        capturedMail,
        new Date(baseNow.getTime() + 31 * 60_000),
      ),
    );
    expect("expired token is rejected", !expiredResult.success);

    const invalidResult = await resetPasswordForRequest(
      { token: randomBytes(32).toString("base64url"), password: newPassword },
      runtime(capturedMail),
    );
    expect("invalid token is rejected", !invalidResult.success);
    expect(
      "invalid expired and used tokens share safe message",
      [oldTokenAttempt, replay, expiredResult, invalidResult].every(
        (result) => result.message === PASSWORD_RESET_INVALID_MESSAGE,
      ),
    );

    const mailCountBeforeDisabledRequests = capturedMail.length;
    await requestPasswordResetForRequest(
      { email: `recovery-banned-${runId}@example.test` },
      runtime(capturedMail),
    );
    await requestPasswordResetForRequest(
      { email: `recovery-deleted-${runId}@example.test` },
      runtime(capturedMail),
    );
    expect(
      "banned and deleted requests do not send email",
      capturedMail.length === mailCountBeforeDisabledRequests,
    );

    const bannedRawToken = randomBytes(32).toString("base64url");
    await prisma.passwordResetToken.create({
      data: {
        userId: bannedId,
        tokenHash: hashPasswordResetToken(bannedRawToken),
        expiresAt: new Date(baseNow.getTime() + 30 * 60_000),
      },
    });
    const bannedReset = await resetPasswordForRequest(
      { token: bannedRawToken, password: newPassword },
      runtime(capturedMail),
    );
    expect("banned account token cannot be consumed", !bannedReset.success);

    const failedDeliveryMail: CapturedMail[] = [];
    await requestPasswordResetForRequest(
      { email: otherEmail },
      {
        ...runtime(failedDeliveryMail),
        mailer: async () => ({ delivered: false }),
      },
    );
    expect(
      "failed delivery leaves no active token",
      (await prisma.passwordResetToken.count({
        where: { userId: otherId, consumedAt: null },
      })) === 0,
    );

    const requestLimiter = boundedLimiter();
    const limitedRequestRuntime = {
      ...runtime([]),
      requestIp: async () => "192.0.2.20",
      rateLimit: requestLimiter,
    };
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await requestPasswordResetForRequest(
        { email: `limited-${runId}@example.test` },
        limitedRequestRuntime,
      );
    }
    let requestLimited = false;
    try {
      await requestPasswordResetForRequest(
        { email: `limited-${runId}@example.test` },
        limitedRequestRuntime,
      );
    } catch (error) {
      requestLimited = error instanceof RateLimitExceededError;
    }
    expect("reset request account limit enforced", requestLimited);

    const attemptLimiter = boundedLimiter();
    const limitedAttemptRuntime = {
      ...runtime([]),
      requestIp: async () => "192.0.2.30",
      rateLimit: attemptLimiter,
    };
    const repeatedInvalidToken = randomBytes(32).toString("base64url");
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await resetPasswordForRequest(
        { token: repeatedInvalidToken, password: "x" },
        limitedAttemptRuntime,
      );
    }
    let attemptLimited = false;
    try {
      await resetPasswordForRequest(
        { token: repeatedInvalidToken, password: "x" },
        limitedAttemptRuntime,
      );
    } catch (error) {
      attemptLimited = error instanceof RateLimitExceededError;
    }
    expect("reset attempt token limit enforced", attemptLimited);

    results.tests = Object.keys(results).length;
    console.log(JSON.stringify({ status: "PASS", results }, null, 2));
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    "PASSWORD RECOVERY: FAIL",
    error instanceof Error ? error.message : "Unknown error",
  );
  process.exitCode = 1;
});
