# Launch placeholder audit

This audit records restaurant-specific placeholder content found before Run 6
and where its authoritative replacement now belongs. Unknown values were not
invented.

| File / area | Value found | Purpose | Customer input required? | Configuration location / resolution |
| --- | --- | --- | --- | --- |
| `src/app/layout.tsx` | `Restaurant`, `Restaurant food ordering app` | Browser/SEO metadata | Yes | `RESTAURANT_NAME`, `RESTAURANT_META_DESCRIPTION` |
| `src/i18n/resources/en.json`, `ar.json` | Generic restaurant brand | Navigation identity | Yes | Removed duplication; `RESTAURANT_NAME` |
| `src/components/ContactSection.tsx` | `+961 XX XXX XXX` | Customer phone | Yes | `RESTAURANT_PHONE` |
| `src/i18n/resources/en.json`, `ar.json` | Generic restaurant address | Visit/contact address | Yes | Removed duplication; `RESTAURANT_ADDRESS`, `RESTAURANT_MAP_URL` |
| `src/i18n/resources/en.json`, `ar.json` | Every day, 9:00 AM–11:00 PM | Marketing hours | Yes | Removed duplication; database `RestaurantHours` is authoritative |
| `src/components/Footer.tsx` | Developer name as restaurant copyright | Customer-facing owner identity | Yes | Replaced by `RESTAURANT_NAME`; legal entity wording still requires approval |
| Repeated logo references | `/Logo.png` | Restaurant identity | Yes | `RESTAURANT_LOGO_URL`; current file remains an unapproved fallback |
| `src/i18n/resources/en.json`, `ar.json` | Generic hero and “Our story” marketing copy | Home-page presentation | Yes | Keep as a draft in localized resources until the owner supplies/approves final copy |
| `public/l.jpg`, `m.jpg`, `n.jpg`, `download.jpeg` | Demo backgrounds | Authentication/demo presentation | Yes | Asset decision in `docs/asset-licenses.md` |
| `public/generated-foods/*`, `public/uploads/foods/*` | Demo/unknown food media | Menu presentation | Yes | Asset decision in `docs/asset-licenses.md` and owner-provided menu data |
| `.env.example` | `owner@example.com`, `noreply@example.com`, localhost | Safe environment examples | Yes before hosting | Expected examples only; replace in untracked deployment environment |
| Financial test fixtures | `89500` and other sample rates | Deterministic conversion tests | No | Test-only values; the application rate remains database-backed |

The generic fallback name and logo remain usable for local development. The
required `npm run check:launch-config:required` command rejects a production
candidate while required identity, business decisions, approvals, delivery
zones, or the exchange rate remain unresolved.
