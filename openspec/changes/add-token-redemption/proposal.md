## Why

Approved project submissions already carry an hours value (`Optional - Override Hours Spent`), and the shop already prices items in hours — but there's no way for a submitter to actually spend what they've earned. This change turns earned hours into a real, spendable balance ("1 token = 1 hour") redeemable against the existing shop catalog, without disturbing the public `/shop` browsing page or introducing a new auth system.

## What Changes

- New Airtable table `Redemptions` (created manually, outside this change's code) — an append-only ledger: Email, Item Name, Cost, Redeemed At.
- New `src/lib/airtable.ts` functions: sum redeemed cost for an email, and create a redemption record — following the existing `getPersonalApprovedHours` / `createAirtableRecord` patterns.
- New `/redeem` page, gated behind the existing Hack Club OAuth session (`requireSession()`/`getIdentity()`, same as `/dashboard`): shows the signed-in user's live token balance → the shop catalog with a "Redeem" button per item.
- New API route(s) for balance lookup and redemption, identifying the caller from their session (never a client-supplied email) and enforcing check-balance-then-write server-side (never write-then-trust).
- Shared item catalog: the `allShopItems` array currently local to `app/shop/page.tsx` becomes a shared constant used by both `/shop` and `/redeem`, so prices can't drift between the two pages.
- `/shop` is unchanged — stays a public, no-login, no-balance browsing page.
- `/obs-timer` and `countApprovedHours` are unchanged — the timer already grows whenever a submission's `Approved` field flips true, independent of redemptions.
- No finite stock/inventory: items remain available regardless of past redemptions.
- No approval workflow for redemptions: spending is instant/synchronous once balance is confirmed sufficient.

## Capabilities

### New Capabilities
- `token-redemption`: earning a token balance from approved submissions, viewing that balance by email, and instantly redeeming it against shop items via a check-then-write ledger.

### Modified Capabilities
(none — `/shop`'s existing behavior is unchanged; the shared catalog is an implementation detail, not a requirements change)

## Impact

- **Airtable (manual prerequisite)**: new `Redemptions` table must exist before this ships — same pattern as the `Approved`/`Review Status` fields added manually for `add-obs-overlays`.
- **Code**: `src/lib/airtable.ts` (new functions), new `app/api/shop/*` route(s), new `app/redeem/page.tsx`, extraction of the shared item catalog out of `app/shop/page.tsx`.
- **No new dependencies, no new datastore** — balance stays a live computation over Airtable, consistent with the rest of the app.
