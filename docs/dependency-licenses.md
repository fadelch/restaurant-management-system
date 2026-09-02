# Dependency license review

Status: **INFORMATIONAL — NOT LEGAL APPROVAL**

This review was generated from the `license` metadata in `package-lock.json`.
Run `npm run licenses:report` after dependency updates. Package metadata can be
incomplete or inaccurate, so final commercial review must also inspect the
license text shipped by the exact package version.

## Direct dependencies

All current direct production and development dependencies report either MIT or
Apache-2.0 licenses in the lockfile. This includes Next.js, React, Prisma,
Sentry's Next.js SDK, Upstash clients, Vercel Blob, bcrypt, i18next, Zod,
Tailwind CSS, ESLint, TypeScript, and test tooling.

This is favorable but does not remove notice, attribution, trademark, hosted
service terms, or transitive-license obligations.

## Lockfile summary

The current lockfile contains 681 installed-package entries, including
platform-specific optional packages.

| Reported license | Entries |
| --- | ---: |
| MIT | 532 |
| Apache-2.0 | 60 |
| ISC | 22 |
| BSD-2-Clause | 13 |
| MPL-2.0 | 12 |
| LGPL-3.0-or-later | 10 |
| FSL-1.1-MIT | 9 |
| BlueOak-1.0.0 | 9 |
| BSD-3-Clause | 6 |
| Apache-2.0 / LGPL / MIT combinations | 4 |
| Python-2.0, CC-BY-4.0, CC0-1.0, 0BSD, MIT-or-CC0 | 5 |

## Items requiring review

- `@img/sharp-libvips-*` and some Sharp platform packages report LGPL-3.0 or
  combined Apache/LGPL/MIT terms. They are transitive image-processing
  components. Review redistribution/dynamic-linking and notice obligations,
  especially if distributing dependencies or binaries rather than source only.
- `lightningcss` platform packages and `axe-core` report MPL-2.0. Review
  file-level source/notice obligations if these packages are modified or
  redistributed.
- `@sentry/cli` and its platform packages report `FSL-1.1-MIT`, an unusual
  time-delayed license used by build/source-map tooling. Review the exact terms
  for the locked version before commercial redistribution.
- `caniuse-lite` reports CC-BY-4.0 for browser-compatibility data; review
  attribution requirements for redistribution.
- BlueOak, Python-2.0, CC0, and mixed-license metadata are less common than the
  project's direct MIT/Apache dependencies and should remain in the release
  notice review.

No AGPL or GPL-only package was identified in the current lockfile scan. That
finding is not a legal conclusion and must be repeated after lockfile changes.

## Hosted services

Open-source package licenses do not cover the commercial terms, privacy terms,
data-processing terms, quotas, or acceptable-use policies of Neon, Upstash,
Sentry, Vercel/Blob, Resend, GitHub, or the deployment provider. Those require
separate owner approval.
