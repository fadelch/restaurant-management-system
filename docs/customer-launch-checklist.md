# Customer launch configuration checklist

Unknown fields must remain blank. Check an approval box only after the named
restaurant owner or legal reviewer has actually approved it.

## Restaurant identity and contact

- [ ] Restaurant name: ____________________________________________
- [ ] Final logo file/path: _______________________________________
- [ ] Logo ownership/trademark evidence: __________________________
- [ ] Phone: ______________________________________________________
- [ ] WhatsApp used? [ ] No [ ] Yes — URL/number: _________________
- [ ] Customer email: _____________________________________________
- [ ] Physical address: ___________________________________________
- [ ] Google Maps URL: ____________________________________________
- [ ] Timezone: ___________________________________________________
- [ ] SEO description: ____________________________________________
- [ ] Instagram used? [ ] No [ ] Yes — URL: _______________________
- [ ] Facebook used? [ ] No [ ] Yes — URL: ________________________

## Opening hours

- [ ] Seven-day schedule reviewed in Admin → Restaurant Operations
- [ ] Monday: ___________________  - [ ] Tuesday: _________________
- [ ] Wednesday: _______________  - [ ] Thursday: ________________
- [ ] Friday: __________________  - [ ] Saturday: ________________
- [ ] Sunday: __________________
- [ ] Overnight shifts confirmed
- [ ] Closed days confirmed
- [ ] Special closures are handled operationally (no dedicated override exists)
- [ ] Set `RESTAURANT_HOURS_APPROVED=true` only after approval

## Delivery and pickup

- [ ] Delivery enabled? [ ] No [ ] Yes
- [ ] Every supported delivery zone entered in Admin
- [ ] Each zone's locations/description approved
- [ ] Each zone's delivery fee approved
- [ ] Each zone's minimum order approved
- [ ] Each zone's estimated delivery time approved
- [ ] Zero-zone behavior accepted: delivery remains unavailable
- [ ] Pickup enabled? [ ] No [ ] Yes
- [ ] Pickup instructions: ________________________________________
- [ ] Pickup minimum order (USD): _________________________________
- [ ] Set `RESTAURANT_DELIVERY_RULES_APPROVED=true` only after approval

## Payment and currency

- [ ] Cash at delivery/pickup approved
- [ ] `RESTAURANT_COD_ENABLED` decision recorded
- [ ] Online card payment intentionally unavailable and not advertised
- [ ] USD/LBP rate: _______________________________________________
- [ ] Person responsible for updating the rate: ___________________
- [ ] Frequency/event for reviewing the rate: _____________________

## Customer policies

- [ ] Privacy Policy reviewed by owner/legal
- [ ] Terms of Service reviewed by owner/legal
- [ ] Refund/Cancellation Policy reviewed by owner/legal
- [ ] Data Retention Policy reviewed by owner/legal
- [ ] Allergy/Food Safety wording reviewed by owner
- [ ] Arabic wording/translation reviewed
- [ ] Final privacy/support contact inserted
- [ ] Set `RESTAURANT_POLICIES_APPROVED=true` only after approval

## Refund and cancellation decisions

- [ ] Customer cancellation request window: _______________________
- [ ] Can preparing orders be cancelled? __________________________
- [ ] Refund approver/role: _______________________________________
- [ ] Are delivery fees refundable? _______________________________
- [ ] Partial food issue evidence/process: ________________________
- [ ] Cash refund method and timing: ______________________________

## Retention, assets, support and handoff

- [ ] Retention durations approved (do not delete financial history automatically)
- [ ] Backup retention/restore responsibility approved
- [ ] Logo, food images, backgrounds and screenshots classified
- [ ] Commercial-use evidence stored at: __________________________
- [ ] Set `RESTAURANT_ASSET_RIGHTS_APPROVED=true` only after approval
- [ ] Customer support contact: ___________________________________
- [ ] Support hours and timezone: _________________________________
- [ ] Emergency/incident contact: _________________________________
- [ ] Hosting/database/backups/maintenance responsibilities approved

## Automated pre-launch result

- [ ] `npm run check:launch-config:required` returns `PASS`
- [ ] Exact reviewed commit: ______________________________________
- [ ] Restaurant owner/reviewer and date: _________________________
