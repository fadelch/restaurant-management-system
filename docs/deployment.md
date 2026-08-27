# Vercel staging deployment

Deploy a Preview environment before Production. Use separate staging resources
for PostgreSQL, Redis, Blob, and Sentry; never point a preview deployment at the
production database.

## Environment variables

| Name | Purpose | Exposure | Requirement |
| --- | --- | --- | --- |
| `DATABASE_URL` | Neon PostgreSQL connection used by Prisma | Server | Required |
| `AUTH_SECRET` | Signs authentication sessions and hashes rate-limit identifiers | Server | Required; at least 32 random characters |
| `SUPER_ADMIN_EMAIL` | Current solo-owner Super Admin identity | Server | Required for the current authorization model |
| `UPSTASH_REDIS_REST_URL` | Shared Upstash Redis endpoint | Server | Required in Preview/Production |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis credential | Server | Required in Preview/Production |
| `RATE_LIMIT_ANALYTICS` | Enables Upstash rate-limit analytics when `true` | Server | Optional; defaults to `false` |
| `SENTRY_DSN` | Server and Edge Sentry event destination | Server | Required for monitored staging/production |
| `NEXT_PUBLIC_SENTRY_DSN` | Browser Sentry event destination | Client/public | Required for client monitoring |
| `SENTRY_ENVIRONMENT` | Server/Edge environment name | Server | Required; use `staging` or `production` |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | Browser environment name | Client/public | Required; use `staging` or `production` |
| `SENTRY_TRACES_SAMPLE_RATE` | Performance trace fraction from 0 through 1 | Server/build | Optional; production default is `0.05` |
| `SENTRY_AUTH_TOKEN` | Uploads source maps during the build | Build secret | Required for useful deployed stack traces |
| `SENTRY_ORG` | Sentry organization slug for source maps | Build | Required with the auth token |
| `SENTRY_PROJECT` | Sentry project slug for source maps | Build | Required with the auth token |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob upload/delete credential | Server | Required in Preview/Production |

`NODE_ENV`, `VERCEL_ENV`, and `NEXT_RUNTIME` are platform/runtime variables and
must not be copied into `.env.example`. `SMOKE_SESSION_COOKIE`,
`SMOKE_USER_EMAIL`, and `SMOKE_EXTRA_ROUTES` are optional local browser-check
inputs, not application deployment variables.

## Prepare staging services

1. Create a separate Neon staging project or branch and copy its pooled,
   TLS-enabled connection string into the Vercel Preview `DATABASE_URL`.
2. Run `npx prisma migrate deploy` against the staging connection from a trusted
   shell before testing the application. Do not run migrations against
   production while preparing Preview.
3. Create a staging Upstash Redis database and add both REST variables to the
   Preview environment.
4. Create/link a Vercel Blob store to the Preview project. Vercel supplies
   `BLOB_READ_WRITE_TOKEN`; verify it is scoped to Preview.
5. Create a Sentry staging project (or use a shared project with environment
   filters), add both DSNs, set both environment names to `staging`, and add the
   build-only source-map variables.
6. Generate `AUTH_SECRET` locally with the following command and save the result
   directly in Vercel; never commit or paste it into documentation:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
   ```

7. Set `SUPER_ADMIN_EMAIL` to the verified owner account that will administer
   staging.

## Deploy Preview

The repository includes `postinstall: prisma generate` because the generated
client is intentionally ignored by Git. Vercel will run the normal `npm install`
and `npm run build` flow.

Using the Vercel dashboard:

1. Import the GitHub repository and keep the framework preset as Next.js.
2. Add every required variable above to the **Preview** environment.
3. Deploy the hardening branch as a Preview deployment; do not promote it.

Using an authenticated CLI instead:

```powershell
npx vercel link
npx vercel env pull .env.preview.local --environment=preview
npx vercel
```

The pulled file is ignored by Git. Delete it securely after testing if it is no
longer needed, and never include it in a ZIP.

## Preview verification

1. Check `/api/health` and `/api/ready` return HTTP 200.
2. Run `npm run test:rate-limit` with the Preview Upstash variables and require a
   `PASS` result.
3. Sign in as an Admin and execute this in the staging browser console:

   ```js
   fetch("/api/admin/sentry-test", { method: "POST" }).then((response) =>
     response.json(),
   );
   ```

   Confirm the returned event ID exists in Sentry, environment is `staging`, the
   stack is symbolicated, and no request body, cookie, authorization data, or
   secret appears.
4. Upload a small valid image in Admin, reload it from its public Blob URL,
   update/delete it, and confirm no local `/uploads` path was stored.
5. Inspect HTTPS headers using `docs/security-headers.md`; HSTS must be present
   and there must be no CSP browser violations.
6. Run `npm run smoke -- https://YOUR-PREVIEW-URL` and manually exercise Home,
   Menu, English/Arabic, Login, Signup, Logout, Cart, Checkout, Orders,
   Favorites, Notifications, Admin, Inventory, Announcements, Audit logs, and
   image upload. Explain every 4xx/5xx before continuing.
7. Run the checkout/concurrency/security matrix against staging test data and
   complete the separate Neon restore drill described in
   `docs/database-recovery.md`.

Promote to Production only after every critical staging check passes and after
setting a separate Production environment-variable set.
