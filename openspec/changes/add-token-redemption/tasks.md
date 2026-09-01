## 1. Manual prerequisite

- [x] 1.1 Create `Redemptions` table in the Airtable base with fields: Email (text), Item Name (text), Cost (number), Redeemed At (date/time). Confirm field names before coding against them (mirrors how `Approved`/`Review Status` were added for `add-obs-overlays`).

## 2. Shared item catalog

- [x] 2.1 Extract `allShopItems` out of `app/shop/page.tsx` into a shared module (e.g. `src/lib/shopItems.ts`), keeping the same items/prices/images.
- [x] 2.2 Update `app/shop/page.tsx` to import from the shared module; verify `/shop` renders identically to before.

## 3. Airtable data layer

- [x] 3.1 In `src/lib/airtable.ts`, add `REDEMPTION_FIELDS` constant (Email, Item Name, Cost, Redeemed At) matching the created table, following the `SUBMISSION_FIELDS`/`MESSAGE_FIELDS` pattern.
- [x] 3.2 Add a `redemptionsTableConfig()` helper reading the appropriate env vars (e.g. `AIRTABLE_REDEMPTIONS_TABLE_NAME`), following `messagesTableConfig()`.
- [x] 3.3 Add `sumRedeemedCost(email): Promise<number>` — sums `Cost` across all `Redemptions` records for that email, following the pagination/formula pattern in `getPersonalApprovedHours`.
- [x] 3.4 Add `createRedemption({ email, itemName, cost }): Promise<AirtableRecord>` — writes a new row to `Redemptions` with a server-generated `Redeemed At` timestamp, following `createMessage`.
- [x] 3.5 Add `getTokenBalance(email): Promise<number>` composing `getPersonalApprovedHours(email) - sumRedeemedCost(email)`.

## 4. API routes

- [x] 4.1 Add `GET /api/shop/balance`: resolve caller via `getSessionFromRequest` + `getIdentity` (401 if missing/invalid), return `{ balance }` via `getTokenBalance(identity.primary_email)`.
- [x] 4.2 Add `POST /api/shop/redeem` accepting `{ itemName }` only (no email in the body): resolve caller via session (401 if missing/invalid), look up price from the shared catalog server-side, compute current balance, reject with 400 + current balance if insufficient, otherwise call `createRedemption` and return `{ balance }` reflecting the deduction.
- [x] 4.3 Handle the "item name not found in catalog" case with a 400 response.

## 5. Redeem page

- [x] 5.1 Create `app/redeem/page.tsx` as a Server Component calling `requireSession()` then `getIdentity()`, following the `/dashboard` pattern (redirects to login if not signed in).
- [x] 5.2 Compute and render the signed-in user's initial balance server-side via `getTokenBalance`.
- [x] 5.3 Render the shared item catalog with a Redeem button per item, disabled when balance < item price.
- [x] 5.4 On Redeem click, call `POST /api/shop/redeem`; on success update displayed balance from the response; on rejection show an insufficient-balance message without changing balance.

## 6. Verification

- [ ] 6.1 Manually verify `/shop` is visually and behaviorally unchanged.
- [ ] 6.2 Manually verify `/redeem` redirects to login when signed out, and shows correct balance when signed in with known Approved hours and Redemptions rows in Airtable.
- [ ] 6.3 Manually verify a redemption attempt exceeding balance is rejected and does not create a Redemptions row.
- [ ] 6.4 Manually verify `/obs-timer` is unaffected (still driven only by `Approved` submissions, not by redemptions).
