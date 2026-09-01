## Context

The repo is a Next.js App Router app. `add-submission-dashboard` turns out to already be implemented in the codebase (`src/lib/airtable.ts`, `app/api/submit`, `app/api/admin/review`, `app/dashboard`, `app/admin`), even though its OpenSpec change was never archived. It makes Airtable base `appTM0LojmyXdd7kW`, table `YSWS Project Submission` (confirmed live via the Meta API) the sole store for submissions, with field-name constants in `SUBMISSION_FIELDS`: `approved` ("Approved"), `githubUsername` ("GitHub Username"), `overrideHours` ("Optional - Override Hours Spent", written from Hackatime-verified tracked hours at submit time). It keeps no application database and only ever reads/writes Airtable server-side via a REST `src/lib/airtable.ts` (no SDK), with the PAT never reaching the browser.

One live-schema gap found via the Meta API: the `Approved` field does not exist on the table yet (task 1.1 of `add-submission-dashboard`'s own tasks.md — adding it is a manual, outside-this-codebase step for that change, still pending). Until it's added, any `filterByFormula` referencing `{Approved}` errors. This change's timer route is written to catch that and degrade to `approvedCount: 0` rather than fail, so it can ship today and self-heal once the field is added — see Decision 1 and Risks.

This change adds two OBS-facing browser sources on top of that same table. OBS Browser Sources are just Chromium tabs pointed at a URL — they can't do OAuth, can't hold a websocket connection reliably across scene switches/reloads, and are typically left open for the whole stream. That shapes every decision below toward: unauthenticated, stateless, polling, and tolerant of the tab being reloaded at any time.

## Goals / Non-Goals

**Goals:**
- `/obs-timer` shows a countdown that visibly grows the moment an admin checks `Approved` on a submission — no separate "sync to unified DB" step required to trigger the bump.
- `/obs-submissions` shows a live, append-only feed of `[github user] submitted a project for [N] hours` as new submissions land.
- Both pages work correctly if the OBS browser source is reloaded mid-stream (no reliance on in-memory/client state to know "where we are").
- Zero PII ever reaches these routes' responses — only what's already meant to be public-facing on stream (GitHub username, hours, an approved count).
- No new persistent store; state is either derived live from Airtable or is a fixed config value (stream start time).

**Non-Goals:**
- No websocket/SSE push. Polling every few seconds is more than adequate for a livestream ticker and avoids Vercel Function lifecycle/connection-count complexity for a low-traffic, always-on OBS tab.
- No "undo an approval" handling for the timer beyond what naturally falls out of it being a pure function of live approved-count (see Decision 1) — if `Approved` is unchecked, the deadline recomputes down accordingly on the next poll. Not treated as a real scenario today (no unapprove action exists in `add-submission-dashboard`), just a documented side effect of the chosen approach.
- No admin controls on these pages themselves (no way to pause/edit the timer from `/obs-timer`) — configuration is env vars only.
- No historical "wall of past submissions" persistence beyond what a fresh page load backfills (see Decision 3) — this is a live ticker, not an archive.

## Decisions

### 1. Timer deadline is a pure function of time + live approved hours, not a stored/mutated value

> **Partially superseded by `add-admin-timer-control` (design.md Decision 1).** The deadline
> now also adds a stored `adjustmentMinutes` term (a manual host offset persisted in an
> Airtable `Stream Config` table, edited via `/admin/timer`). Approved-hours stays a pure
> live read exactly as described below; only the manual-adjustment term is stored/mutated.

Discovered during implementation: the homepage (`app/page.tsx`) already commits to a specific rule in its own copy — *"every hour building increases the stream by 20 minutes"* / *"as soon as your project gets approved, the stream increases in length"*. So the increment is per-hour-claimed, not a flat amount per approved project. This design is updated to match the product's existing stated rule instead of introducing a competing one.

`deadline = STREAM_START_AT + TIMER_INITIAL_MINUTES + (Σ hours-claimed over all Approved=TRUE records × TIMER_MINUTES_PER_HOUR)`, all computed fresh on every `/api/obs/timer` request from one Airtable read (`filterByFormula={Approved}=TRUE()`, paged, summing each record's hours field) plus two env-var constants (`TIMER_INITIAL_MINUTES`, `TIMER_MINUTES_PER_HOUR`, default `20` to match the homepage copy). The client displays `deadline - now()` and re-polls periodically to correct drift.
- *Alternative considered*: a flat increment per approved project regardless of hours (the original draft of this design, before the homepage copy was found). Rejected once found to contradict the site's own stated rule.
- *Alternative considered*: track a mutable "current deadline" that gets bumped inside the Approve action itself (event-driven, more traditional). Rejected — it requires either a new persistent store (a database this project explicitly avoids) or writing timer state into Airtable, plus it couples this change to editing `add-submission-dashboard`'s `/api/admin/review` handler. The pure-function approach needs no new storage, no dedup/idempotency logic for "did I already count this approval," and is trivially correct after a crash or redeploy.
- *Consequence*: if an admin ever unchecks `Approved`, the displayed deadline would shrink back on the next poll. Documented as accepted behavior (see Non-Goals), not a bug — there is no unapprove action in the current design to guard against.

### 2. Both routes are unauthenticated, read-only, and minimize what they return
`/api/obs/timer` returns `{ deadline: <ISO>, approvedCount: <int> }` only. `/api/obs/submissions` returns `{ githubUsername, hoursClaimed, submittedAt }[]` only — built by selecting exactly those fields in the Airtable query (not fetched-then-filtered), matching the same "select only what's needed at the query level" discipline `add-submission-dashboard`'s admin queue already commits to for PII.
- *Alternative considered*: reuse the HCA session/admin-allowlist gate. Rejected — OBS Browser Sources have no way to complete an OAuth redirect or hold a login session; the pages must be reachable with a bare URL.

### 3. `/obs-submissions` backfills recent history on load, then polls forward from a client-held cursor
On mount, the client fetches the most recent ~20 submissions (Airtable `sort` by `Created` desc, `maxRecords=20`) to populate the feed immediately (so a mid-stream OBS reload doesn't show a blank feed). It then polls `/api/obs/submissions?since=<cursor>` every few seconds, where `cursor` starts at the newest `submittedAt` from the initial load and advances to the newest timestamp seen after each poll. All cursor state lives in the browser tab only — a reload just re-runs the backfill.
- *Alternative considered*: server-side cursor persistence (so a reload doesn't need the backfill call). Rejected — adds a "current position" store for no real benefit; the backfill call is cheap and the reload-and-catch-up behavior is exactly what's wanted for a stream ticker.

### 4. "Hours claimed" reuses the existing `Optional - Override Hours Spent` field — no new Airtable field needed
Discovered during implementation: `add-submission-dashboard` is already implemented (`src/lib/airtable.ts`, `app/api/submit/route.ts`), not just proposed. Its `/api/submit` already writes the Hackatime-verified tracked hours into `Optional - Override Hours Spent` (`SUBMISSION_FIELDS.overrideHours`) on every create/update — despite the field's name (chosen for the human admin's benefit in Airtable, as a value they can override), it's exactly the "hours claimed" figure needed here. This change reads that field directly instead of asking for a new `Hours Claimed` field. Still treated as optional/nullable: a record where it's blank (e.g. pre-dating this field's use) renders without a hard failure.
- *Alternative considered (superseded)*: adding a brand-new `Hours Claimed` field. No longer needed now that the existing field's real behavior is known.
- *Alternative considered*: have this change's own API re-derive hours by calling Hackatime directly. Rejected — duplicates OAuth/token-handling logic that only exists inside `add-submission-dashboard`'s session layer; this change has no user session to call Hackatime with.

### 5. Pages are minimal, transparent-background, unstyled-chrome components meant for OBS compositing
Both `/obs-timer` and `/obs-submissions` render large, high-contrast text on a transparent (`background: transparent`) page body, no navbar/footer chrome (they bypass the shared app layout's nav), sized to be cropped/positioned as an OBS Browser Source rather than viewed as a normal page.

## Risks / Trade-offs

- [Polling interval too slow feels laggy on stream; too fast risks Airtable rate limits] → Poll every 4-5s for both routes; page each request's Airtable calls only as far as needed (approved-count query pages through all matches, submissions query caps at `maxRecords`).
- [Counting `Approved=TRUE()` records requires paging through all of them on every request as approvals accumulate over a long event] → Acceptable at this scale (a single livestream YSWS event, likely low hundreds of submissions); revisit with a cached/derived count if it becomes a real cost.
- [`Approved` field doesn't exist on the live table yet — a `filterByFormula` referencing it 422s] → `/api/obs/timer` catches this and returns `approvedCount: 0` (logging a warning) rather than failing the whole route; once `add-submission-dashboard`'s task 1.1 adds the field, counts start working with no code change here.
- [These routes are public; someone could hit `/api/obs/submissions` directly to scrape GitHub usernames + claimed hours] → Accepted: this is exactly the information meant to be shown on a public livestream anyway, so no additional exposure beyond the event's own purpose.

## Migration Plan

1. Add `STREAM_START_AT`, `TIMER_INITIAL_MINUTES`, `TIMER_MINUTES_PER_HOUR` to `.env.local`/`.env.prod`.
2. Ship `/api/obs/timer` + `/obs-timer` — testable today even though `approvedCount`/hours will read as 0 until `add-submission-dashboard`'s `Approved` field is added to Airtable (see Context).
3. Ship `/api/obs/submissions` + `/obs-submissions` — testable today against existing submission rows.
4. Once `add-submission-dashboard`'s `Approved` field is added and admins start approving, verify the timer actually extends by `hoursClaimed × TIMER_MINUTES_PER_HOUR` per approval.

No rollback complexity: both routes are read-only and stateless; reverting the deploy removes them with no data cleanup.

## Open Questions

- Exact env var values for `STREAM_START_AT` / `TIMER_INITIAL_MINUTES` / `TIMER_MINUTES_PER_HOUR` — event-specific numbers to be set by the user before the stream; `TIMER_MINUTES_PER_HOUR` defaults to `20` to match the homepage's existing copy, but should be confirmed as the actual intended rule.
