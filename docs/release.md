# Release process

This document defines the repository release process. It does not authorize a
deployment and does not replace staging, cloud verification, customer
acceptance, or owner approval.

## Release prerequisites

- Use Node.js 24, as pinned by `.nvmrc` and `package.json`.
- Start from a reviewed branch with a clean Git working tree.
- Keep `.env` files and credentials outside Git. Only `.env.example` belongs in
  source control.
- Use a disposable local/CI PostgreSQL database for automated integration tests.
- Use separate staging resources for PostgreSQL, Upstash, Sentry, Blob, and
  Resend. Never test a release against production data.
- Resolve every `REQUIRES REVIEW` item in `docs/asset-licenses.md` and obtain
  owner decisions for `docs/software-terms-checklist.md`.

## Local pre-release checks

With a disposable PostgreSQL `DATABASE_URL` and a test-only `AUTH_SECRET`:

```bash
npm ci
npx prisma migrate deploy
npm run verify
npm run check:launch-config:required
```

`npm run verify` runs Prisma validation/generation, TypeScript, lint, unit
tests, database-backed suites, password-recovery tests, customer-auth tests, a
production build, and authorization tests. It stops at the first failure.

The local command deliberately does not claim that hosted services work. A
local pass is not cloud verification.

The optional check included in `npm run verify` reports unresolved customer
configuration without blocking development. The required command must pass
before staging/customer acceptance; it rejects missing identity fields, known
user-facing placeholders, unapproved hours/delivery/policies/assets, missing
delivery zones when delivery is enabled, and a missing USD/LBP rate.

## CI expectations

GitHub Actions runs on every push and pull request using Node 24 and a
disposable PostgreSQL 16 service. CI must pass all required checks before a
release candidate can enter staging.

The ordinary CI job has no production Neon, Upstash, Sentry, Blob, Resend, or
Vercel credentials. Its Upstash step may report `NOT TESTABLE` as a visible
warning. That status is not `PASS` and is unacceptable for the later production
release verification. Run this only in an authorized staging verification
environment with staging credentials:

```bash
npm run test:rate-limit:required
```

## Database migrations

1. Review every migration file and its expected locks/data transformation.
2. Confirm the migration was tested by CI against disposable PostgreSQL.
3. Take or verify a restorable staging backup before applying the migration.
4. Apply migrations to staging with `npx prisma migrate deploy`.
5. Run staging readiness, smoke, data-integrity, checkout, and authorization
   checks after migration.
6. Rehearse recovery for destructive or difficult-to-reverse schema changes.
7. Only after staging acceptance, schedule the production migration with a
   verified backup and monitoring in place.

Never run `prisma migrate reset` against staging or production. Never edit a
migration that has already been applied. Do not deploy an untested migration
directly to production.

## Promotion order

Use this order without skipping gates:

1. Clean Git state
2. CI `PASS`
3. Staging/Preview deployment
4. Staging migrations
5. Staging smoke test
6. Cloud verification
7. Customer acceptance
8. Final version and signed/annotated tag
9. Production promotion

Promote the exact commit/artifact accepted in staging. Do not rebuild from a
different working tree for production.

## Versioning and tagging

Use semantic versions for release candidates and releases. The current
`0.1.0` version intentionally indicates that hosting verification, launch
content, asset approval, customer acceptance, and support terms are unfinished.
Do not create `1.0.0` or a final commercial tag until those gates are complete.

When authorized after customer acceptance:

1. Update `package.json` and `package-lock.json` together.
2. Merge the reviewed release commit.
3. Create an annotated tag such as `v1.0.0` on the accepted commit.
4. Push the tag only after confirming the commit hash and CI result.

## Rollback considerations

- Record the deployed commit, migration list, and environment configuration
  before promotion.
- Prefer backward-compatible, expand-and-contract schema changes so the prior
  application can run during rollback.
- Rolling back application code does not roll back database migrations.
- Never reverse a production migration casually. Use the rehearsed recovery or
  a reviewed forward-fix migration.
- Preserve order, payment, refund, inventory, audit, and customer-history data.
- Verify backup restoration separately as described in
  `docs/database-recovery.md`.
- Document the incident, customer impact, recovery decision, and final state.

## Source package

Create a source-only archive from a clean working tree:

```powershell
npm run package:source
```

The packaging script includes tracked source, documentation, Prisma schema and
migrations, lockfiles, and `.env.example`. It excludes secrets, dependencies,
build output, coverage, logs, caches, temporary files, and Git metadata.
