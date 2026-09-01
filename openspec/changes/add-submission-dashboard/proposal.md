## Why

Right now there's no way for a user to submit a project against this program without a human manually collecting links and hours. We want submitters to verify themselves via Hack Club's identity provider (HCA), connect their Hackatime account so hours are pulled from a source they can't fake, and land in Airtable automatically. On the other side, one admin (me) needs a fast, low-noise screen to check submissions, approve/reject/flag fraud, and correspond with a submitter through fix-and-resubmit rounds — without wading through PII to do it.

## What Changes

- Add HCA OAuth login (`auth.hackclub.com`), matching `hackclub/ispy`'s pattern: stateless encrypted-JWT session cookie (`jose`, `EncryptJWT`, `A256GCM`), no session database.
- Add a Hackatime OAuth connection step, reusing the same access token pattern as HCA to call Hackatime's API for the submitter's tracked project hours and GitHub username.
- Add a submitter dashboard where a verified, Hackatime-connected user submits a project: Code URL, Playable URL, Description, Screenshot, Lapse Link(s), plus the required personal fields (name/email/address/birthday — HCA scope for these is HQ-Official-tier-gated, so they're manual form fields per the `ispy` precedent, not autofilled).
- Every submission is written directly to the existing Airtable base (`YSWS Project Submission` table) via server-side calls — no application database of any kind.
- Add 5 new fields to `YSWS Project Submission`: `Approved` (checkbox), `Review Status` (select: Pending/Rejected/Fraud), `Reviewed At`, `Reviewed By`. (User adds these fields directly in Airtable; this change does not alter table/field structure through the API.)
- Add a new Airtable table, `Submission Messages` (linked to `YSWS Project Submission`), to hold a threaded, multi-round conversation between admin and submitter. (User creates this table in Airtable; not created by this change.)
- Add an admin review screen, gated to a hardcoded HCA-email allowlist (`sebastianhernandez@hackclub.com`), showing **only**: a "Telescreen Link" (`joe-cool.jollyy.dev/billy/overview?u=[hackatime id]`, treated as an opaque external URL), Code URL, Playable URL, Lapse Link(s), and Screenshot — explicitly no name/email/address/birthday. Actions: Approve, Reject (with message), Fraud-flag (terminal, single field write, no cascading block).
- Add a message thread (read + reply) visible on both the admin screen and the submitter's own dashboard, so rejection reasons and fixes can go back and forth multiple times before resubmission.
- Add a resubmit flow: fixing and resubmitting **edits the same Airtable record in place** (one submission per person) and resets `Review Status` to Pending — it does not create a new row.
- Admin queue defaults to unreviewed submissions (`Review Status = Pending` and `Approved` unchecked), with filter/search by status (Approved/Rejected/Fraud/Pending).

## Capabilities

### New Capabilities
- `hackclub-oauth`: HCA login, session cookie issuance/decryption, identity retrieval, admin-allowlist gating.
- `hackatime-connection`: Hackatime OAuth connect step, fetching tracked project hours and GitHub username using the HCA-issued access token.
- `project-submission`: Submitter-facing dashboard, form validation, server-side re-validation, Airtable record create/update (resubmit-in-place), one-record-per-person semantics.
- `submission-review`: Admin queue screen, PII-free field surface, Approve/Reject/Fraud actions, status filtering, Airtable writes for review state.
- `submission-messaging`: Threaded admin↔submitter messages backed by the `Submission Messages` table, rendered on both the admin screen and the submitter dashboard.

### Modified Capabilities
- (none — `nextjs-app-shell` is unaffected at the requirements level; this change only adds new routes within it)

## Impact

- **New routes**: `/dashboard` (submit + view own submission + message thread + resubmit), `/admin` (review queue), plus `app/api/auth/*` (HCA login/callback/logout), `app/api/auth/hackatime/*` (connect/callback), `app/api/submit`, `app/api/admin/review`, `app/api/messages`.
- **New env vars**: `OAUTH_CLIENT_ID`/`OAUTH_CLIENT_SECRET` (already present), `HACKATIME_CLIENT_UID`/`HACKATIME_SECRET` (already present), `AIRTABLE_BASE_ID`/`AIRTABLE_TABLE_NAME`/`AIRTABLE_PAT` (already present), plus a new `SESSION_SECRET`.
- **External dependency**: `jose` package for encrypted session cookies (not currently a dependency of this repo).
- **Airtable base** (`appTM0LojmyXdd7kW`): 5 new fields on `YSWS Project Submission`, 1 new linked table `Submission Messages` — both added manually by the user in the Airtable UI, not provisioned by this change.
- **No database**: this change explicitly does not introduce Postgres/Prisma usage; the existing shop's Postgres/Prisma setup is untouched and unrelated.
- **No changes** to existing shop/prize pages or Prisma schema.
