-- The confirmation field was never intended for storage. Abort instead of
-- silently dropping data if a legacy value is unexpectedly present.
DO $password_recovery_preflight$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "public"."User" WHERE "confirm_password" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Password recovery migration aborted: confirm_password still contains data.';
  END IF;
END
$password_recovery_preflight$;

ALTER TABLE "public"."User"
  ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0,
  DROP COLUMN "confirm_password";

CREATE TABLE "public"."PasswordResetToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" VARCHAR(64) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key"
ON "public"."PasswordResetToken"("tokenHash");

CREATE INDEX "PasswordResetToken_userId_consumedAt_idx"
ON "public"."PasswordResetToken"("userId", "consumedAt");

CREATE INDEX "PasswordResetToken_expiresAt_idx"
ON "public"."PasswordResetToken"("expiresAt");

ALTER TABLE "public"."PasswordResetToken"
ADD CONSTRAINT "PasswordResetToken_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
