## Context

Submissions live in Airtable's `YSWS Project Submission` table (`src/lib/airtable.ts`). Approved submissions carry an `Optional - Override Hours Spent` numeric value. `getPersonalApprovedHours(email)` already sums this across a person's `Approved=TRUE` records — that's the "earned" side of a token balance, already live in the codebase.

There is a real session-based login already: Hack Club OAuth (`auth.hackclub.com`) plus a Hackatime OAuth leg, stored in an encrypted session cookie (`src/lib/session.ts`, `src/lib/auth.ts`). `requireSession()` (Server Components, e.g. `/dashboard`) and `getSessionFromRequest()` (Route Handlers, e.g. `/api/submit`, `/api/messages`, `/api/admin/review`) both resolve a session; `getIdentity(session.access_token)` then returns `{ primary_email, first_name, ... }` from Hack Club. `/dashboard` already renders a user's `personalHours` this way — this is the established identity pattern in the app, not a new one. The shop (`app/shop/page.tsx`) is a static, hardcoded catalog with no backend at all.

No app database exists — Airtable is the sole datastore.

## Goals / Non-Goals

**Goals:**
- Let a submitter see their current token balance and redeem it against the shop catalog, instantly.
- Keep balance computation live/derived (earned − spent), no cached counters, no new datastore — consistent with `countApprovedHours`/`getPersonalApprovedHours`.
- Prevent overspending via server-side check-then-write, not client trust.
- Keep `/shop` exactly as it is today for anonymous browsing.

**Non-Goals:**
- No new authentication system — reuse the existing Hack Club OAuth session (`requireSession()`/`getIdentity()`), the same identity mechanism `/dashboard`, `/submit`, and `/messages` already use.
- No finite stock/inventory enforcement.
- No redemption approval/fulfillment workflow or status tracking in-app (admins can eyeball the `Redemptions` table in Airtable directly if they need to fulfill physical items).
- No changes to `/obs-timer` or `countApprovedHours` — approval-driven timer growth already works and is orthogonal to spending.

## Decisions

**Balance = live computation, not a stored field.**
`balance(email) = getPersonalApprovedHours(email) - sumRedeemedCost(email)`, computed fresh on every balance check and every redemption attempt. Alternative considered: cache a running balance on a per-person record — rejected because there's no per-person record to attach it to (submissions are one-to-many per email), and it would introduce a second source of truth that can drift from Airtable.

**Redemptions is an Airtable table, not a new database.**
Matches the existing architecture (Airtable as sole datastore) and the existing `Messages` table pattern (`listMessages`/`createMessage` keyed by a formula filter). One row per redemption: Email, Item Name, Cost, Redeemed At. Cost is snapshotted at redemption time so a later shop price change doesn't rewrite history.

**The `Redemptions` table is a manual prerequisite, not code-created.**
Same approach as the `Approved`/`Review Status` fields added for `add-obs-overlays` — Airtable schema changes are made by hand in the base, and code assumes the table/fields already exist (with the same "degrade gracefully if missing" pattern `countApprovedHours` uses, where reasonable).

**Identity comes from the session, never from the client body/query.**
Both API routes call `getSessionFromRequest(request)` then `getIdentity(session.access_token)` to get `identity.primary_email`, exactly like `/api/submit` and `/api/messages`. No route accepts an `email` field from the client — this closes the "spend anyone's balance by typing their email" hole a plain email-input design would have.

**Check-then-write happens server-side in one API route.**
`POST /api/shop/redeem { itemName }` (email comes from the session, not the body):
1. Resolve the caller's email from the session; 401 if not signed in.
2. Compute balance server-side.
3. Look up item price from the shared catalog server-side (never trust a client-supplied price).
4. If `balance < price`, return 400 with the current balance.
5. Otherwise write to `Redemptions`, then return the new balance.

This isn't a true atomic transaction (Airtable has none), but it closes the realistic gap for this cohort size — the same trust level the rest of the app already operates at. `GET /api/shop/balance` (no params — email from session) serves the read-only balance check the `/redeem` page needs before showing buttons as enabled/disabled.

`/redeem` itself is a Server Component using `requireSession()` (redirects to `/api/auth/login` / `/api/auth/hackatime/login` if not signed in, same as `/dashboard`), so an unauthenticated visitor never sees the page at all.

**Shared item catalog.**
`allShopItems` moves out of `app/shop/page.tsx` into a shared module (e.g. `src/lib/shopItems.ts`) that both `/shop` and `/redeem` import, and that the redeem API route also imports for server-side price lookups. This guarantees `/shop`'s displayed prices and `/redeem`'s charged prices can never drift apart.

**`/redeem` page shape.**
Server Component, `requireSession()` at the top (same pattern as `/dashboard`) → resolves `identity.primary_email` server-side → renders initial balance directly (no client fetch needed for first paint) + the catalog with per-item Redeem buttons (disabled when balance < price) as a small client component → clicking Redeem calls `POST /api/shop/redeem` and updates balance in place from the response.

## Risks / Trade-offs

- **[Risk]** No transactional guarantee — two near-simultaneous redemption requests for the same signed-in user could both pass the balance check before either write lands. → **Mitigation**: acceptable given cohort size and instant/no-inventory design (nothing runs out); can add an Airtable-side idempotency/lock pattern later if abuse is observed.
- **[Risk]** `Redemptions` table missing (not yet created in Airtable) will break redemption instead of degrading silently, unlike `countApprovedHours`'s "missing field → 0" fallback. → **Mitigation**: this is intentional — redemption is a write path, silently no-op-ing a spend request would be worse than a clear error; tasks.md calls out the manual table creation as a blocking prerequisite.

## Open Questions

None outstanding — identity (session-based, corrected mid-implementation after discovering the existing OAuth session), ledger shape, instant redemption, no-stock, and no-approval-workflow were all confirmed with the user.
