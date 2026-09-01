## 1. Prerequisites

- [x] 1.1 Confirm live Airtable field names via the Meta API — done: `Approved` (not yet present on the table; pending `add-submission-dashboard`'s own manual step), `GitHub Username` (present), hours claimed lives in `Optional - Override Hours Spent` (present, already written by `/api/submit`) — no new field needed
- [x] 1.2 Add `STREAM_START_AT`, `TIMER_INITIAL_MINUTES`, `TIMER_MINUTES_PER_HOUR` to `.env.local` and `.env.prod`

## 2. Shared Airtable read helpers

- [x] 2.1 Add `countApprovedHours()` to `src/lib/airtable.ts`: pages through `{Approved} = TRUE()`, sums the hours field, catches/logs and returns `0` if the field doesn't exist yet (422)
- [x] 2.2 Add `listSubmissionsCreatedAfter(sinceIso, { maxRecords })` to `src/lib/airtable.ts`: paginated read of `GitHub Username` + hours field, filtered by `IS_AFTER(CREATED_TIME(), ...)` when `sinceIso` given, sorted by `createdTime` (Airtable's built-in record timestamp, immune to resubmit-in-place edits)

## 3. Timer API and page

- [x] 3.1 Implement `app/api/obs/timer/route.ts`: read `approvedHours` via `countApprovedHours()`, compute `deadline = STREAM_START_AT + TIMER_INITIAL_MINUTES + approvedHours * TIMER_MINUTES_PER_HOUR`, return `{ deadline, approvedHours }` only
- [x] 3.2 Implement `/obs-timer` page: transparent background, no shared nav/footer, fetches deadline on load, renders a client-side countdown (HH:MM:SS) ticking at least once per second
- [x] 3.3 Add periodic re-polling of `/api/obs/timer` from the page (every 5s) to correct client-clock drift and pick up new approvals
- [x] 3.4 Handle the deadline-passed case: render a zero/expired state instead of a negative countdown
- [ ] 3.5 Manually verify end-to-end: once `add-submission-dashboard`'s `Approved` field exists and an admin approves a submission with H hours claimed, confirm the deadline moves by exactly `H × TIMER_MINUTES_PER_HOUR`; confirm a page reload mid-countdown shows the correct remaining time

## 4. Submissions API and page

- [x] 4.1 Implement `app/api/obs/submissions/route.ts` GET: no `since` → most recent N (backfill); `since=<ISO>` → records created after cursor; return `{ githubUsername, hoursClaimed, submittedAt }[]` only, `hoursClaimed` nullable
- [x] 4.2 Implement `/obs-submissions` page: on load, fetch backfill (~20 most recent) to populate the feed immediately
- [x] 4.3 Add client-side polling (every 5s) using `since=<newest submittedAt seen>`, appending new items to the feed
- [x] 4.4 Render each item as `[github user] submitted a project for [N] hours`, omitting the hours clause gracefully when `hoursClaimed` is null
- [x] 4.5 Style as a scrolling chat-style list, transparent background, no shared nav/footer, sized for OBS Browser Source compositing
- [ ] 4.6 Manually verify against real submissions: a new submission appears on the open page without reload; resubmitting an existing record (update, not create) does not produce a duplicate line; a record with blank hours still renders a line

## 5. Final checks

- [x] 5.1 Confirm both `/api/obs/timer` and `/api/obs/submissions` responses contain no PII fields (name, email, address, birthday, Code URL, Playable URL) — checked at the query-selection level, not just render level
- [x] 5.2 Confirm both routes work with no session cookie / no auth header present
- [x] 5.3 Confirm no changes were made to existing shop/prize pages or the Prisma schema
- [ ] 5.4 Load `/obs-timer` and `/obs-submissions` as OBS Browser Sources (or a plain browser tab at matching dimensions) and confirm transparent background and legible sizing
