# Privacy and data-retention inventory

Status: **DRAFT — REQUIRES OWNER / LEGAL REVIEW**

This inventory describes fields and behavior found in the application. It does
not establish a lawful basis or retention period and is not legal advice.

| Data category | Why the app uses it | Storage / processor | Who can access it | Admin display? | Account-removal behavior |
| --- | --- | --- | --- | --- | --- |
| Name and email | Account creation, login, order identification, recovery | PostgreSQL `User`; email provider receives recovery recipient when configured | Customer and authorized admins as required | Yes | Cleared when an account with business history is anonymized; history-free account can be deleted |
| Password hash and session version | Authentication and session revocation | PostgreSQL `User`; signed session ID/version in HTTP-only cookie | Application authentication code | Password is never displayed | Cleared and session version incremented on anonymization |
| Phone number | Delivery/pickup contact | Order-time `Order.customerPhone` snapshot | Customer and authorized operational admins | Yes, with order | Retained with historical order; duration requires decision |
| Delivery address | Delivering an order | `Order.customerAddress` | Customer and authorized operational admins | Yes, with order | Retained with historical order; duration requires decision |
| Map/location link | Customer-supplied delivery location | `Order.mapLocation`; browser geolocation is used only when customer requests it | Customer and authorized operational admins | Yes, with order | Retained with historical order; duration requires decision |
| Order notes and customization | Preparation and fulfillment instructions | `Order.orderNotes`, `OrderItem` customization fields | Customer and authorized operational/kitchen admins | Yes | Retained with historical order; duration requires decision |
| Order, payment, refund and issue history | Fulfillment, support, financial/operational records | PostgreSQL orders, items, issue reports and refund fields | Customer for their orders; authorized admins | Yes | Preserved after anonymization by design |
| Favorites and notifications | Customer convenience and announcements | PostgreSQL | Customer; restricted server/admin operations | Limited operational access | Cascade-deleted when the user row is deleted; anonymized-user handling requires owner review |
| Password-reset data | Account recovery and abuse prevention | Hashed reset token, expiry, consumption state in PostgreSQL; email provider if configured | Recovery service; no raw token stored | No ordinary Admin display | Tokens cascade-delete with user; expiry/cleanup operations require an owner decision |
| IP/account/token rate-limit identifiers | Preventing login, recovery, checkout and admin abuse | HMAC-hashed identifiers in Upstash when configured | Application/security operators | No normal Admin display | Provider retention requires configuration and owner/legal decision |
| Admin email and audit changes | Accountability for privileged actions | PostgreSQL `AuditLog` | Authorized admins | Yes | Historical audit records are preserved; duration requires decision |
| Monitoring/security event metadata | Reliability and security investigation | Sentry when configured; privacy scrubber removes request bodies and known credentials | Authorized technical operators | Not in restaurant Admin UI | Provider retention requires configuration and owner/legal decision |
| Uploaded food media | Menu display | Local development storage or Vercel Blob when configured | Public menu visitors and authorized admins | Yes | Business-content lifecycle; not automatically tied to account removal |

## Required decisions

- Privacy contact and customer request procedure: **REQUIRES OWNER / LEGAL DECISION**
- Lawful basis for each processing purpose: **REQUIRES OWNER / LEGAL DECISION**
- Retention durations and deletion schedules: **REQUIRES OWNER / LEGAL DECISION**
- Backup retention and deletion behavior: **REQUIRES OWNER / LEGAL DECISION**
- Final processor list and data-processing terms: **REQUIRES OWNER / LEGAL DECISION**
- Treatment of favorites/notifications for anonymized accounts: **REQUIRES OWNER / LEGAL DECISION**

Historical orders, order items, refunds, issue reports, inventory movements,
audit history, and order-time customer snapshots must not be automatically
deleted merely because account access is removed.
