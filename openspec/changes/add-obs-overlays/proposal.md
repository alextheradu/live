## Why

This YSWS program runs as a livestream event: viewers should see the event's countdown timer grow every time a new project gets approved, and see a live feed of incoming submissions, without an admin manually updating an overlay. We need two lightweight, unauthenticated pages designed to be added as OBS Browser Sources so the stream can show this activity in real time, reading off the same Airtable base the submission/review flow (`add-submission-dashboard`) already uses.

## What Changes

- Add `/obs-timer`: a full-bleed, transparent-background countdown timer meant for an OBS Browser Source. The deadline is computed from a configured stream start time + base duration, extended by the claimed hours of every project currently `Approved` in Airtable × a configurable minutes-per-hour rate (matching the site's existing homepage copy: "every hour building increases the stream by 20 minutes") — so approving a project in the admin dashboard immediately grows the on-stream clock, independent of whether that project has been pushed through the separate YSWS Unified sync automation.
- Add `/obs-submissions`: a scrolling chat-style feed, also for an OBS Browser Source, that appends a line — `[github user] submitted a project for [N] hours` — for every new `YSWS Project Submission` record as it's created, polling Airtable rather than requiring a push/webhook mechanism.
- Add two small, unauthenticated read-only API routes (`/api/obs/timer`, `/api/obs/submissions`) that these pages poll; both only ever return the minimal public fields needed (approved hours / deadline math; GitHub username + hours claimed) — never PII (name, email, address, birthday).
- Both routes reuse the "hours claimed" figure already written by the existing (implemented, if not yet archived) `add-submission-dashboard` change: its `/api/submit` persists Hackatime-verified tracked hours into `Optional - Override Hours Spent` on every submission. No new Airtable field is needed; a blank value is treated as "hours unknown" and rendered gracefully rather than failing.

## Capabilities

### New Capabilities
- `obs-timer`: computes and serves the livestream countdown deadline (stream start + base duration + approved-project increments) and renders it as a browser-source page.
- `obs-submissions`: polls for newly created submission records and renders them as a live, chat-style feed on a browser-source page.

### Modified Capabilities
- (none — this change only adds new read-only routes/pages; it does not change the requirements of `nextjs-app-shell`, and `add-submission-dashboard`'s capabilities aren't finalized specs yet, so no delta spec applies to them)

## Impact

- **New routes**: `/obs-timer`, `/obs-submissions` (pages), `app/api/obs/timer/route.ts`, `app/api/obs/submissions/route.ts` (GET-only, unauthenticated, read-only).
- **Depends on `add-submission-dashboard`** (implemented in `src/lib/`, `app/api/submit`, `app/api/admin/review`, though its own `Approved` Airtable field is still pending a manual step there): reads the same `YSWS Project Submission` Airtable table (`Approved` field for the timer, `GitHub Username` + `Optional - Override Hours Spent` for the submissions feed).
- **No new Airtable field**: hours are read from the existing `Optional - Override Hours Spent` field already written by `/api/submit`.
- **New env vars**: `STREAM_START_AT` (ISO timestamp), `TIMER_INITIAL_MINUTES`, `TIMER_MINUTES_PER_HOUR`.
- **No application database**: both routes read Airtable directly server-side (reusing/extending `src/lib/airtable.ts`) and are otherwise stateless; the countdown deadline is a pure function of time + live approved-hours, not a stored/mutated value.
- **No auth**: both pages/routes are intentionally public (OBS Browser Source can't do OAuth), and are designed to leak nothing beyond a count, a timestamp, a GitHub username, and an hours number.
