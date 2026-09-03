# Restaurant configuration architecture

Restaurant-specific values are split by how they change. This prevents the
same information from being hardcoded in multiple components.

## Environment-backed launch identity

`src/lib/restaurantConfig.ts` reads the identity and explicit business
decisions documented in `.env.example`. The root layout passes the safe public
profile through `RestaurantProvider`; navigation, metadata, contact, signup,
and footer components consume that shared value.

These values are deployment configuration rather than Admin-editable data:

- restaurant name and local logo path
- phone, WhatsApp URL, email, address and map URL
- Instagram and Facebook URLs
- IANA timezone and SEO description
- delivery, pickup and cash-payment enablement
- pickup instructions and pickup minimum order
- recorded owner approvals

Unknown booleans default to disabled. Unknown contact values display
`REQUIRES CUSTOMER INPUT` in development. A release candidate must pass
`npm run check:launch-config:required`; placeholders are never accepted as
production configuration.

## Database-backed operational settings

The Admin → Restaurant Operations page is authoritative for:

- seven-day `RestaurantHours`
- `DeliveryZone` names, coverage descriptions, delivery fees, minimum orders,
  estimated times and availability
- the `RestaurantSettings.usdToLbpRate` exchange rate

The same hours evaluator supplies navigation/marketing status and checkout, so
the displayed status and checkout availability cannot use different schedules.
Database hours remain hidden and checkout remains closed until
`RESTAURANT_HOURS_APPROVED=true` records real owner approval.

There is no dedicated special-closure/holiday override. The operator must
temporarily mark affected days closed or the feature must be added in a future
approved change. Overnight hours are supported: a closing time less than or
equal to the opening time closes on the following day; equal times represent a
24-hour shift.

## Delivery and pickup safety

- Delivery is available only when cash payment, delivery, and the delivery-rule
  approval are all enabled and at least one available delivery zone exists.
- The server independently enforces the selected active zone, zone fee and zone
  minimum. Zero zones never means unrestricted delivery.
- Pickup bypasses address and delivery-zone validation and never adds a
  delivery fee. Its configured minimum is enforced separately.
- Cash is recorded as `Cash on Delivery` or `Cash on Pickup`. Online card
  payment is not implemented or advertised.

## Currency

The database value `RestaurantSettings.usdToLbpRate` is the only application
exchange-rate authority. If it is absent, the UI retains `LBP rate not
configured`. Numeric rates in financial tests are deterministic fixtures, not
production configuration.
