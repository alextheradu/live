## 1. Prerequisites (manual, outside codebase)

- [x] 1.1 Added `Approved` (checkbox), `Review Status` (single select: Pending/Rejected/Fraud), `Reviewed At` (dateTime), `Reviewed By` (single line text) fields to `YSWS Project Submission` — created directly via the Airtable Meta API (`POST .../tables/{tableId}/fields`) with the PAT, per explicit direction, rather than manually in the Airtable UI as originally scoped in design.md
- [x] 1.2 Added `Submission` (link to `YSWS Project Submission`), `Sender` (single select: Admin/Submitter), `Message` (multiline text), `Sent At` (dateTime) fields to the existing `Submission Messages` table, same way. Note: the table's 4 stock placeholder fields (Notes/Assignee/Status/Attachments) could not be removed — Airtable's API has no field-deletion endpoint (confirmed: returns `NOT_FOUND`) — so they remain, unused, until deleted by hand in the Airtable UI
- [x] 1.3 Confirmed the exact field/option names created in 1.1/1.2 via the Airtable Meta API — they match the names assumed in design.md/specs and already used in `src/lib/airtable.ts` exactly, no code changes needed
- [x] 1.4 Add `SESSION_SECRET` to `.env.local` and `.env.prod` (`.env.local` done; `.env.prod` is empty/unused locally — prod env is managed via `vercel env`, flagged in final report)
- [x] 1.5 Add `jose` to `package.json` dependencies

## 2. Session & HCA OAuth

- [x] 2.1 Implement `lib/session.ts`: `encryptSession`/`decryptSession` (jose, EncryptJWT/jwtDecrypt, dir/A256GCM, key from sha256(SESSION_SECRET)), cookie options (httpOnly, secure, sameSite=lax, 7-day TTL)
- [x] 2.2 Implement `lib/hackclub.ts`: `exchangeCodeForTokens`, `getIdentity`, scope constant `name email verification_status`
- [x] 2.3 Implement `app/api/auth/login/route.ts`: redirect to `auth.hackclub.com/oauth/authorize`
- [x] 2.4 Implement `app/api/auth/callback/route.ts`: exchange code, fetch identity, set session cookie; handle failed/denied callback without creating a partial session
- [x] 2.5 Implement `app/api/auth/logout/route.ts`: clear session cookie
- [x] 2.6 Implement an admin-allowlist check helper (`lib/admin.ts` or similar) checking identity email against a hardcoded list (`sebastianhernandez@hackclub.com`)
- [ ] 2.7 Manually verify: login → callback → session cookie set → protected route reads identity; tampered/expired cookie is rejected

## 3. Hackatime connection

- [x] 3.1 Confirmed: `.env.local` has separate `HACKATIME_CLIENT_UID`/`HACKATIME_SECRET` distinct from the HCA OAuth app, so implemented as a genuine second OAuth authorize/callback hop against `hackatime.hackclub.com/oauth/*`, not token reuse
- [x] 3.2 Implement `lib/hackatime.ts`: token exchange, `getHackatimeMe` (GitHub username), `getHackatimeProjects` (tracked hours), scope `profile read`
- [x] 3.3 Implement `app/api/auth/hackatime/login/route.ts` and `app/api/auth/hackatime/callback/route.ts`; merge `hackatime_access_token` into the existing session cookie without creating a new session
- [ ] 3.4 Manually verify: HCA-authenticated user without Hackatime connection is prompted to connect; successful connect merges token into session; failed connect leaves HCA session intact

## 4. Airtable data layer

- [x] 4.1 Implement `lib/airtable.ts`: `createAirtableRecord`, `updateAirtableRecord` (PATCH), `listSubmissions`/`findSubmissionByEmail` (GET with `filterByFormula`), `uploadAirtableAttachment`, `deleteAirtableRecord`
- [x] 4.2 Define the field-name constants for `YSWS Project Submission` (reuse existing field names confirmed via Meta API: Code URL, Playable URL, First Name, Last Name, Email, Screenshot, Description, GitHub Username, Address fields, Birthday, Justification - Submitter Hackatime ID, Justification - Lapse Links, plus the new Approved/Review Status/Reviewed At/Reviewed By)
- [x] 4.3 Define field-name constants for `Submission Messages` (Submission link, Sender, Message, Sent At) — reads `AIRTABLE_MESSAGES_TABLE_NAME` env var (added to `.env.local`)

## 5. Submitter dashboard & submission API

- [x] 5.1 Build `/dashboard` page: `requireSession()` redirects to Hackatime connect if not connected; shows submission form (pre-filled if a submission already exists) otherwise
- [x] 5.2 Build the submission form: Code URL, Playable URL, Description, Screenshot upload, Lapse Link(s) (optional), autofilled read-only GitHub Username, manual Address + Birthday fields; client-side required attrs plus server-rendered field errors
- [x] 5.3 Implement `app/api/submit/route.ts`: require valid session + Hackatime connection; server-side re-validate all required fields; re-fetch tracked hours from Hackatime server-side; look up existing record by email via `findSubmissionByEmail`; create new record or update existing (resubmit-in-place, reset Review Status to Pending); upload screenshot attachment; roll back (delete record) only on first-submission failure, not on an update
- [x] 5.4 Add "my submission" view on `/dashboard`: current `Review Status`/`Approved`, message thread, resubmission via the same pre-filled form
- [ ] 5.5 Manually verify: first submission creates a record; missing required field is rejected server-side even if client validation is bypassed; resubmission updates the same record and resets status to Pending; failed attachment upload leaves no orphaned record (blocked — needs a live HCA+Hackatime login to exercise)

## 6. Admin review queue

- [x] 6.1 Build `/admin` page (gated by allowlist check from 2.6): queue list defaulting to `Approved` unchecked AND `Review Status = Pending`, with a status filter/search control (Pending/Approved/Rejected/Fraud)
- [x] 6.2 Ensure the Airtable read for the queue selects only Telescreen-Link-source (Hackatime ID), Code URL, Playable URL, Lapse Link(s), Screenshot, and review-state fields — never Name/Email/Address/Birthday, at the query level not just the render level (via `fields[]` on the Airtable request, see `listSubmissions`)
- [x] 6.3 Implement Telescreen Link derivation: `https://joe-cool.jollyy.dev/billy/overview?u=<url-encoded Justification - Submitter Hackatime ID>`
- [x] 6.4 Implement `app/api/admin/review/route.ts`: Approve action (set `Approved`, `Reviewed At`, `Reviewed By`); Reject action (require non-empty message, set `Review Status = Rejected`, `Reviewed At`, `Reviewed By`, create linked message); Fraud action (set `Review Status = Fraud`, `Reviewed At`, `Reviewed By`, single-record only)
- [ ] 6.5 Manually verify: queue defaults to unreviewed only; filter switches correctly between statuses; Approve/Reject/Fraud each write the correct fields; Reject without a message is rejected client- and server-side; no PII appears anywhere in the admin page's network payload (blocked — needs a live admin login; Airtable fields now exist)

## 7. Submission messaging

- [x] 7.1 Implement `app/api/messages/route.ts`: GET thread for a submission (by linked record), POST a new message; enforce sender identity (submitter's session email must match the record's Email field; Admin sender requires passing the allowlist check)
- [x] 7.2 Render the message thread + reply box on the admin queue's per-submission detail view
- [x] 7.3 Render the identical message thread + reply box on the submitter's `/dashboard`
- [ ] 7.4 Manually verify: messages from both sides appear in the same order on both screens; a user cannot post a message linked to someone else's submission; a non-admin cannot post with `Sender = Admin`; multiple rounds across a reject → message → resubmit → reject cycle all remain in one thread (blocked — needs a live login; `Submission Messages` schema now corrected)

## 9. Multi-submission dashboard + hardware/software track (added after initial apply, per direction)

- [x] 9.1 Add `listSubmissionsByEmail` and `getSubmissionById` to `src/lib/airtable.ts`; add `getPersonalApprovedHours` (sums `Optional - Override Hours Spent` across a person's `Approved` records)
- [x] 9.2 Rework `app/api/submit/route.ts`: drop the email-based find-or-create; accept an optional `recordId` — absent means always create new, present means fetch-by-ID + verify `Email` ownership + update; branch validation and Hackatime-project lookup on a new `track` field (software/hardware). Also fixed `app/api/messages/route.ts`'s ownership check, which still used the old single-record-by-email lookup and would have resolved to the wrong record for anyone with more than one submission
- [x] 9.3 Update `src/lib/submission.ts` validation to be track-conditional (software requires `hackatimeProject`; hardware requires `lapseLinks` + a self-reported `hardwareHours` value)
- [x] 9.4 Update `SubmissionForm.tsx`: add a Software/Hardware track toggle; show Hackatime project select only for Software, Lapse Link + hours input only for Hardware; accept an optional `recordId`/defaults pair for editing one specific existing submission
- [x] 9.5 Rework `/dashboard`: personal approved-hours total; "submit a new project" form always available; new `SubmissionsList` component listing all of the user's own submissions (status, links, hours), each with its own message thread and an edit-and-resubmit action wired to that record's ID
- [ ] 9.6 Manually verify: submitting twice creates two records, not one; editing one via its resubmit action only changes that record; hardware track submission with no Hackatime project succeeds; software track without a project selection is rejected; personal hours total reflects only `Approved` records (blocked — needs a live login)

## 8. Final checks

- [x] 8.1 Confirmed: `app/shop/page.tsx`, `app/components/ShopItem.tsx`, and every other pre-existing file were only read, never edited. No Prisma schema exists in this repo currently (the "Postgres+Prisma for shop data" plan from an earlier memory was never actually implemented — confirmed no `prisma/` dir, no Prisma/Postgres deps or env vars anywhere in the repo)
- [x] 8.2 Confirmed: no database, ORM, or KV store was added — `npm install jose` was the only dependency change; all new persistence goes through `src/lib/airtable.ts`
- [ ] 8.3 Run through the full end-to-end flow once: login → connect Hackatime → submit → admin reviews/rejects with message → submitter sees message, replies, fixes, resubmits → admin approves (blocked — needs live HCA/Hackatime OAuth and the Airtable schema from section 1 to be finished by the user)
