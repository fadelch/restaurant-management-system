# Architecture review and refactor report

## Outcome

The application remains a Next.js 15 App Router application backed by Prisma and PostgreSQL. Existing exported server-function names were retained. The refactor concentrates on trust boundaries, atomic inventory/order writes, safe browser projections, typed pagination/sorting, one provider stack, i18next, and the new announcement/notification feature.

## Important application flows

### Customer checkout

`cart/page.tsx` → `CartContext` → `purchaseCart()` → `requireUser()` → Zod purchase validation → restaurant/food/zone/coupon lookup → database price/customization calculation → Prisma transaction → order + items + conditional stock decrements + stock movements + coupon usage → PostgreSQL.

The cart's price and stock values are display hints only. Checkout recalculates prices from the database. Stock uses `updateMany({ qty: { gte: quantity } })`, so two buyers cannot push stock below zero.

### Admin order status

Admin route layout → `requireAdmin()` → status/ID validation → serializable Prisma transaction → current state claim → batched food lookup → stock restoration or conditional deduction → order/payment status update → stock movements + audit log.

### Announcement publication

Admin manager → `setAnnouncementPublished()` → `requireAdmin()` → ID validation → Prisma transaction → announcement update → active-user query → one `createMany` notification fan-out → audit log.

Unpublishing removes the related in-app notifications transactionally. Editing a published announcement synchronizes its notification snapshot.

### Notification ownership

Navbar bell → 30-second polling → `requireUser()` → recent notifications + unread count in parallel. Mark-one uses both notification ID and authenticated user ID. Mark-all uses only the authenticated user ID. No browser-supplied user ID is trusted.

## Parallel, sequential, and transactional decisions

### PARALLEL

- Paginated admin data: page rows + total count; audit filters and finished-order archive counts where applicable.
- Announcement page: rows + total count.
- Notification bell: recent rows + unread count.
- Admin operations: zones + hours + coupons + users + food categories.
- Dashboard: order data + customer total + low-stock rows + low-stock count.
- Checkout settings: restaurant status + available delivery zones.
- Checkout: independent delivery-zone and coupon lookups after the subtotal is known.
- Food update: existing food + destination food type.
- Admin order-item form: order options + food options.

### SEQUENTIAL

- Authentication must resolve before its user ID or role can be used.
- Validation happens before database access.
- Checkout food data must exist before prices/customizations/totals can be calculated.
- Announcement recipients must be known before their `createMany` payload can be formed.
- An updated stock value is read after a successful conditional decrement to record accurate movement values.

### TRANSACTIONAL

- Checkout: create order/items, decrement stock, stock movements, and coupon usage.
- Order cancellation/reactivation: status claim, stock updates, movements, payment state, audit.
- Order deletion: stock restoration, deletion, audit.
- Admin order-item insertion: database price, conditional stock decrement, order totals, movement, audit.
- Manual inventory and food quantity updates: stock value, movement, audit.
- Food-issue review: single-review claim, refund/payment update, audit.
- Payment-status update and audit.
- Announcement create/update/delete/publish/unpublish, notification fan-out/removal, and audit.

## Security and data-boundary changes

- `getCurrentUser()` explicitly selects non-secret fields. It no longer returns password columns.
- Order/customer/admin queries use explicit safe user selects instead of `user: true`.
- User mutation results no longer serialize password fields.
- Admin order-item pricing comes exclusively from the selected database food.
- Server actions retain `requireUser`, `requireAdmin`, or `requireSuperAdmin`; `sessionStorage` is not an authority.
- Upload validation now checks file size, declared MIME allowlist, and JPEG/PNG/WebP magic bytes.
- Foods used by order history cannot be cascade-deleted; setting stock to zero preserves history.
- Dynamic Prisma sorting uses typed allowlist maps.
- Prisma and authentication modules are server-only.
- `AUTH_SECRET` is required; the database connection string is no longer reused as a signing secret.
- Session signing rejects secrets shorter than 32 characters, and expected login failures return typed results instead of HTTP 500 responses.
- Baseline response headers deny framing, disable MIME sniffing, restrict referrers, and disable unused camera/microphone/geolocation permissions.

## Query and performance changes

- Shared pagination parsing and result metadata live in `src/lib/pagination.ts`.
- Admin `where` values use generated `Prisma.*WhereInput` types.
- Sort values resolve to generated `Prisma.*OrderByWithRelationInput` objects.
- Checkout uses one `findMany({ id: { in: ids } })` and a map instead of per-line food queries.
- Order stock restoration/deduction batches foods and aggregates duplicate food lines.
- Food-type deletion uses `count` instead of loading records.
- Notification fan-out uses `createMany`, not one insert per loop.
- Fixed local hero, logo, and authentication images use `next/image`; the home hero transfer measured about 59 KB through the optimizer instead of serving the original ~2 MB PNG.
- TanStack Query was not introduced: the only recurring client fetch is a small 30-second notification poll, while existing admin tables already use server pagination and explicit mutation refreshes.
- TanStack Table was not introduced: current table state is small and server-driven, so it would add package and abstraction cost without removing meaningful server complexity.

## Type report

### Types moved

- The manually maintained model-like declarations in `src/types/index.ts` were replaced by domain files under `src/types/`.
- Cart types moved from `src/context/CartContext.tsx` to `src/types/cart.ts`.
- Repeated page/component user, food, order, food-type, issue-report, and payment-status declarations now use shared domain types or exact server return types.

### Types removed

- Manual `User`, `FoodItem`, `FoodType`, `Order`, `OrderItem`, and `FoodIssueReport` database mirrors.
- Local duplicate payment-status and food-type model declarations.
- Repeated pagination input shapes in server pagination functions.

### Prisma types reused

- `Prisma.UserGetPayload`, `FoodGetPayload`, `FoodTypeGetPayload`, `OrderGetPayload`, `FoodIssueReportGetPayload`, `AnnouncementGetPayload`, and `NotificationGetPayload`.
- `Prisma.UserWhereInput`, `FoodWhereInput`, `FoodTypeWhereInput`, `OrderWhereInput`, `AuditLogWhereInput`, and `AnnouncementWhereInput`.
- Generated relation-aware order-by types and `Prisma.TransactionClient`.

### Zod-derived types

- `AnnouncementInput` from `announcementSchema`.
- Food create/update inputs from `foodSchema`.
- `OrderStatus` and `PaymentStatus` from their schemas.
- `PageInput` from `pageOptionsSchema`.

### Shared types

- `announcement.ts`, `cart.ts`, `common.ts`, `food.ts`, `notification.ts`, `order.ts`, `pagination.ts`, and `user.ts`.

### Intentionally local types

- React component props used by only their component.
- Exact `Awaited<ReturnType<...>>` table data types used by one feature.
- Small server-internal session payload, audit actor, announcement form draft, and chart types.

## Layout and i18n report

### Before

- Root layout directly nested three client providers.
- A custom language context contained state and both translation dictionaries.
- Home set `lang`/`dir` on a page wrapper.
- Admin pages repeated the navbar.
- No-op route templates added remount boundaries without behavior.

### After

```text
src/app/layout.tsx
  AppProviders
    I18nextProvider
    LanguageSync
    MessageProvider
    CartProvider
    route layouts
      Admin/layout.tsx (server authorization + shared admin navbar)
      cart/layout.tsx (server authorization)
      DeleteUser/layout.tsx (server super-admin authorization)
      announcements/layout.tsx (server authorization + customer shell)
```

The root layout remains a Server Component. It owns `<html lang="en" dir="ltr" data-scroll-behavior="smooth">`. `LanguageSync` changes only the document language/direction when i18next changes and persists the selected language. i18next is the sole language state.

The nested authorization layouts remain because they provide server-side route boundaries, not duplicated global provider/font/document setup. Admin navigation is rendered once by the Admin layout. The no-op auth and main templates were removed.

## Announcement and notification implementation

- Admin CRUD/search/filter/sort/page UI at `/Admin/announcements`.
- Publish/unpublish authorization and audit actions:
  `CREATE_ANNOUNCEMENT`, `UPDATE_ANNOUNCEMENT`, `PUBLISH_ANNOUNCEMENT`, `UNPUBLISH_ANNOUNCEMENT`, and `DELETE_ANNOUNCEMENT`.
- Published user list/detail pages at `/announcements` and `/announcements/[id]`.
- Optional event and expiration dates.
- Notification unread count, recent dropdown, mark-one, mark-all, and associated announcement navigation.
- Notifications are polling-based every 30 seconds. They are not WebSocket realtime or browser push notifications.

## Database changes and migration

New `Announcement` and `Notification` models include relations, publication/read state, dates, a unique per-user announcement notification, and query indexes.

The migration is:

`prisma/migrations/20260825090000_add_announcements_notifications/migration.sql`

Apply locally with:

```bash
npx prisma migrate dev
```

Apply already-committed migrations in production with:

```bash
npx prisma migrate deploy
```

Also configure a long random `AUTH_SECRET` in every runtime environment before login/session use. The local ignored `.env` is now configured; deployed environments still need their own independent value.

## Packages

Added runtime packages: `i18next`, `react-i18next`.

Added development packages: `eslint`, `eslint-config-next`; added `npm run lint` and a flat ESLint config.

The safe `npm audit fix` updated Next.js within the existing 15.5 patch line. Remaining advisories are transitive Prisma/Next build-tool advisories whose automated fixes require breaking version changes; no `--force` upgrade was applied.

## Verification

- `npm install`: completed.
- `npx prisma generate`: completed.
- `npx prisma validate`: passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed without warnings/errors.
- `npm run build`: passed on Next.js 15.5.24.
- `npm test`: 7 focused validation, pagination, sort-allowlist, and food-customization tests passed.
- `npm run smoke -- http://localhost:3100`: clean Chrome desktop/mobile and English/Arabic smoke coverage with console, network, redirect, image, performance, and response-header capture.
- `npx prisma migrate status`: all 16 migrations are applied to the configured database.

## Important file structure after refactor

```text
src/
├── app/
│   ├── layout.tsx
│   ├── Admin/announcements/
│   └── announcements/
├── components/
│   ├── announcements/
│   ├── notifications/
│   └── providers/
├── i18n/
│   ├── config.ts
│   └── resources/{en,ar}.json
├── lib/
│   ├── pagination.ts
│   ├── prismaSelects.ts
│   ├── sorting.ts
│   └── validation/announcements.ts
├── server/
│   ├── announcements.ts
│   └── notifications.ts
└── types/
    ├── announcement.ts
    ├── cart.ts
    ├── common.ts
    ├── food.ts
    ├── notification.ts
    ├── order.ts
    ├── pagination.ts
    └── user.ts
```
