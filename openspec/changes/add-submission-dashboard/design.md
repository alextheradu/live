## Context

This repo is currently a Next.js (App Router) shop/prize site with Postgres+Prisma for shop data (see `add-multi-prize-cart`-era memory, `src/shop`). It has no auth, no OAuth, no Airtable integration today. `.env.local` already contains live credentials for three external systems this change depends on: `OAUTH_CLIENT_ID`/`OAUTH_CLIENT_SECRET` (HCA OAuth app), `HACKATIME_CLIENT_UID`/`HACKATIME_SECRET`, and `AIRTABLE_PAT`/`AIRTABLE_BASE_ID`/`AIRTABLE_TABLE_NAME` pointing at base `appTM0LojmyXdd7kW`, table `YSWS Project Submission` (`tbl4K92vv61uwMeI3`).

That Airtable table was inspected directly via the Meta API before this design was written. It already has `Code URL`, `Playable URL`, `Justification - Lapse Links, comma-separated`, and `Justification - Submitter Hackatime ID` — exactly the fields the review screen needs — plus a full YSWS Unified pipeline (`Automation - Submit to Unified YSWS`, `Automation - Status` formula, Loops merge-field formulas). This change's review state (`Approved`, `Review Status`, `Reviewed At`, `Reviewed By`) is additive and orthogonal to that existing automation; it does not modify or replace it.

The reference implementation is `hackclub/ispy` (Next.js App Router, live source inspected directly): HCA OAuth → stateless encrypted-JWT session → Hackatime API call reusing the same token → server-side Airtable write. Notably, `ispy`'s own design explicitly lists "no admin/review UI" as a non-goal ("Airtable itself is the review surface") — the admin review screen in this change has no reference implementation to draw from and is new design surface.

## Goals / Non-Goals

**Goals:**
- No application database of any kind. Sessions are stateless (encrypted JWT cookie); Airtable is the only persistent store, for both submissions and review/messaging state.
- OAuth client secrets and the Airtable PAT never reach the browser.
- Hours/identity data used for gating or display comes from server-side API calls at read time, never trusted from client input.
- The admin screen surfaces zero PII (no name/email/address/birthday) — only project-verification signals.
- A submitter can fix and resubmit an in-review-or-rejected project without creating a duplicate record.
- Multi-round, two-way messaging between admin and submitter survives across resubmissions.

**Non-Goals:**
- ~~No multi-project-per-person support~~ **Superseded during implementation**: the user explicitly asked for a dashboard showing all of a person's previous submissions plus a personal hours-contributed total, which only makes sense with multiple records per person. See revised Decision 5.
- No automatic email delivery. Messages live in Airtable (`Submission Messages` table); any actual email/notification is out of scope and left to existing Airtable-side automation (the base already has Loops merge fields) or manual follow-up.
- No fraud-triggered account ban / resubmission block. `Review Status = Fraud` is a single field write on that record; it does not gate future submissions from the same email.
- No changes to the existing shop/prize Postgres+Prisma code path.
- No creation of Airtable tables/fields via the API — the 5 new submission fields and the new `Submission Messages` table are added manually by the user in the Airtable UI before implementation begins.

## Decisions

### 1. Mirror `ispy`'s stateless-session architecture exactly
`lib/session.ts`: `jose`'s `EncryptJWT`/`jwtDecrypt`, `dir`/`A256GCM`, key derived via `sha256(SESSION_SECRET)`, httpOnly/secure/sameSite=lax cookie, 7-day TTL. Payload holds `{ access_token, refresh_token, expires_at, hackatime_access_token }` — nothing else. No session table.
- *Alternative considered*: next-auth. Rejected — `ispy`'s custom approach is simpler for a single OAuth provider pair and avoids a dependency with its own session-storage assumptions that could pull in a database.

### 2. Reuse the HCA access token as the Hackatime bearer token where possible, else a second OAuth hop
`ispy` found the HCA identity token worked directly against Hackatime's API. This repo's `.env.local` has *separate* `HACKATIME_CLIENT_UID`/`HACKATIME_SECRET`, implying a distinct Hackatime OAuth app/client here rather than the same-token reuse `ispy` documented. Treat this as a genuine second OAuth hop (`/api/auth/hackatime/login` + `/callback`, as scaffolded by the existing env vars) and store its token separately in the session payload (`hackatime_access_token`), confirming against the live Hackatime OAuth app during implementation rather than assuming token reuse.

### 3. HCA OAuth scope stays minimal; PII fields are manual form inputs
Per `ispy`'s documented finding, `birthdate`/`address` are HQ-Official-tier-gated scopes; a Community-tier app requesting them gets "invalid scope" outright. Request `name email verification_status` only. Birthday and full address are required manual form fields, validated client-side for UX and server-side authoritatively — same pattern as `ispy`.

### 4. Airtable is the only data store; writes are direct REST calls, no SDK
Port `lib/airtable.js` near-verbatim: `createAirtableRecord`, `uploadAirtableAttachment` (base64 to `content.airtable.com`), plus new `updateAirtableRecord` (PATCH, for resubmit-in-place and review-state writes) and `listAirtableRecords` (GET with `filterByFormula`, for the admin queue and the submitter's own-record lookup by email).

### 5. A person can have multiple submissions; each is edited in place by its own record ID, not looked up by email (REVISED)
Originally: at most one record per person, found and overwritten by email. Superseded per explicit direction — the dashboard now needs to list *all* of a person's submissions (distinct projects, each independently reviewed) plus a personal hours-contributed total, which requires multiple records per person.

`/api/submit` now takes an optional `recordId`:
- **No `recordId`** (submitting a new project): always creates a new record. `findSubmissionByEmail` is no longer used to decide create-vs-update.
- **`recordId` present** (fixing a specific rejected/pending project and resubmitting): the record is fetched by ID (`getSubmissionById`) and ownership is verified — the record's `Email` field must match the authenticated user's identity email — before it's PATCHed. This is still resubmit-in-place, just scoped to one specific project instead of "the" (singular) project. `Review Status` resets to `Pending` on that record only.

The dashboard lists a person's submissions via a new `listSubmissionsByEmail`, and a personal "hours contributed" stat via a new `getPersonalApprovedHours` (sums `Optional - Override Hours Spent` across that person's `Approved = TRUE` records) — mirroring the shape of the concurrent `add-obs-overlays` change's global `countApprovedHours`, just scoped to one email.
- *Alternative considered*: keep one-record-per-person and treat "previous submissions" as edit history within that one record. Rejected — Airtable records don't version themselves, so this would require a separate history table for no benefit over just allowing multiple top-level records, which Airtable (and the review queue, and the Unified YSWS automation) already handle natively as independent rows.

### 5a. Hardware vs. Software track: Hackatime project is required only for Software
The submission form now asks the user to pick a track. **Software** requires selecting a Hackatime project (as before — hours are re-derived server-side from Hackatime). **Hardware** does not require a Hackatime project; instead it requires a Lapse Link and a self-reported hours number, written directly to `Optional - Override Hours Spent` — this mirrors `Optional - Override Hours Spent`'s original purpose in the live schema (an override for when Hackatime isn't the source of truth) and matches `ispy`'s own precedent ("Hardware submissions have no Hackatime project, so self-reported hours are used as-is"). No new Airtable field was added for "track" itself — it's inferred from which of `Justification - Hackatime Project Name(s)...` / `Justification - Lapse Links...` is populated, the same way the live schema's own `Automation - Unified Justification` formula already branches on those two fields.
`Justification - Submitter Hackatime ID` and GitHub Username are still populated from the Hackatime connection regardless of track, since Hackatime is still connected at login either way (needed for the Telescreen Link) — only the *project selection* is track-conditional.

### 6. Review state as 4 flat fields, not a single status enum, because approval is a separate UI action
`Approved` (checkbox) is written independently by the Approve action. `Review Status` (select: `Pending`/`Rejected`/`Fraud`) is written by Reject/Fraud actions. These are deliberately two different fields rather than one 4-value enum, per explicit direction that approval "adds a check, a separate field, next to that row" — i.e., Approve is a lighter-weight, single-field action distinct from the Reject/Fraud flow which also requires a message.

### 7. Threaded messaging via a linked child table, not a growing text blob
`Submission Messages` (linked to `YSWS Project Submission`, `Sender` select Admin/Submitter, `Message`, `Sent At`) holds one row per message. Both `/admin` and the submitter's `/dashboard` query this table filtered by the linked submission and render it as a thread, with a reply box that POSTs a new row. Chosen over appending to a single `Review Message` text field because concurrent/multi-round edits to one field risk clobbering and lose per-message authorship/timestamp — a linked table gives that for free and matches how Airtable is normally used for comment threads.

### 8. Admin gating is a hardcoded email allowlist, not a roles system
`/admin` and `app/api/admin/**` check `identity.primary_email === 'sebastianhernandez@hackclub.com'` (single-entry array, easy to extend later) after decrypting the session — no roles table, no Airtable-side admin list. Simplest thing that satisfies "for admin users 'me'."

### 9. Admin screen renders exactly: Telescreen Link, Code URL, Playable URL, Lapse Link(s), Screenshot — plus action controls
Telescreen Link is derived, not stored: `https://joe-cool.jollyy.dev/billy/overview?u=${encodeURIComponent(hackatimeId)}` where `hackatimeId` is `Justification - Submitter Hackatime ID` from the record — treated as an opaque external URL, no validation of what it points to. `Name`/`Email`/`Address`/`Birthday` are never read into the admin page's server component or sent to its client bundle, not just hidden by CSS — the Airtable read for the queue selects only the fields needed for display plus the review-state fields.

## Risks / Trade-offs

- [Hackatime token reuse assumption from `ispy` may not hold here, given separate `HACKATIME_CLIENT_UID`/`HACKATIME_SECRET`] → Confirm empirically during implementation (decision 2); scaffold both OAuth routes regardless since the env vars already imply a second hop.
- [No duplicate/fraud-reuse protection beyond the flagged record itself] → Accepted per explicit non-goal; a fraud-flagged person can immediately create a fresh submission under the same email since resubmit-in-place only fires when a *matching* record is found, and nothing blocks a new one. Flag as a known gap if it matters later.
- [Manual Airtable schema changes (5 fields + 1 table) are a hard dependency the user must complete before `/api/admin/review` and `/api/messages` can be implemented] → Sequence tasks so OAuth/session/basic-submit work lands first and is independently testable before the review/messaging layer needs the new schema.
- [Airtable attachment upload size/format limits, per `ispy`'s own flagged risk] → Surface as a submission-time error rather than silently failing; not re-verified here, carried over as an open risk.
- [`filterByFormula` lookups by email for "does this person already have a record" are eventually-consistent-ish and not atomic] → Acceptable for this use case (low submission volume, single admin); not building for concurrent-write correctness.

## Migration Plan

1. User adds the 5 fields to `YSWS Project Submission` and creates the `Submission Messages` table in Airtable (manual, outside this codebase).
2. Add `SESSION_SECRET` to `.env.local` / `.env.prod`; add `jose` dependency.
3. Ship HCA OAuth + session (`/api/auth/login`, `/callback`, `/logout`) — independently testable (login works, session cookie set/read).
4. Ship Hackatime OAuth connect step — independently testable (connect flow, token stored in session).
5. Ship `/dashboard` submit flow + `/api/submit` (create-or-update-by-email) — independently testable end-to-end against Airtable.
6. Ship `/admin` queue + `/api/admin/review` (Approve/Reject/Fraud) — requires step 1's new fields to exist.
7. Ship messaging thread (`/api/messages`, rendered on both `/admin` and `/dashboard`) — requires step 1's new table to exist.

No rollback complexity beyond standard revert-the-deploy — no data migration, no schema owned by this codebase.

## Open Questions

- Does the separate `HACKATIME_CLIENT_UID`/`HACKATIME_SECRET` pair mean a full second OAuth authorize/callback hop, or is it used differently (e.g., a machine-to-machine credential rather than a user-facing OAuth client)? Needs confirming against Hackatime's actual OAuth docs/behavior during implementation — decision 2 assumes the former.
- Exact Airtable field type chosen by the user for `Review Status` (single select vs. text) and `Sender` on `Submission Messages` — implementation should read the live schema via the Meta API before writing to confirm option names match exactly (`Pending`/`Rejected`/`Fraud`, `Admin`/`Submitter`).
