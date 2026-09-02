# Rate limiting

Production requests use Upstash Redis through `@upstash/ratelimit`. External
identifiers are HMAC-SHA256 hashed with `AUTH_SECRET` before they are sent to
Redis. Missing or unavailable Redis blocks protected mutations in production;
local development may run without Redis so the application remains usable.

| Action | Identifier | Limit | Window | Fail policy |
| --- | --- | ---: | --- | --- |
| Login | Trusted client IP | 10 | 10 minutes | Closed in production |
| Login | Normalized account email | 5 | 10 minutes | Closed in production |
| Signup | Trusted client IP | 5 | 10 minutes | Closed in production |
| Password-reset request | Trusted client IP | 5 | 15 minutes | Closed in production |
| Password-reset request | Normalized account email | 3 | 15 minutes | Closed in production |
| Password-reset attempt | Trusted client IP | 10 | 15 minutes | Closed in production |
| Password-reset attempt | Hashed token identifier | 5 | 15 minutes | Closed in production |
| Checkout | Authenticated user ID | 10 | 1 minute | Closed in production |
| Admin mutation | Authenticated admin ID | 60 | 1 minute | Closed in production |
| Food issue report | Authenticated user ID | 5 | 10 minutes | Closed in production |
| Food image upload | Authenticated admin ID | 10 | 10 minutes | Closed in production |

Login and signup HTTP routes return `429` and `Retry-After` when limited. Server
actions reject safely with the same typed rate-limit error. Password-reset
responses remain generic so an attacker cannot discover registered accounts.

Run `npm run test:rate-limit` with staging Upstash credentials to verify the
distributed store. The check uses an isolated temporary prefix and verifies
requests within the limit, one request above it, recovery after the window, and
isolation between two identifiers. Without credentials it reports `NOT
TESTABLE`; that result is not a pass.

For an authorized staging/production-release verification, require configured
credentials and a real `PASS` result:

```bash
npm run test:rate-limit:required
```

This command exits non-zero when the service is `NOT TESTABLE`.
