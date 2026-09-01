## Context

The livestream timer is defined in `app/api/obs/timer/route.ts` as a pure function
(see `add-obs-overlays` design Decision 1):

```
deadline = STREAM_START_AT
         + TIMER_INITIAL_MINUTES
         + approvedHours * TIMER_MINUTES_PER_HOUR
```

`approvedHours` is read live from Airtable via `countApprovedHours()`. `/obs-timer`
polls this route every 5s and renders `deadline - now`. The homepage (`app/page.tsx`)
is a separate client component that decrements a local `useState(24*60*60)` counter
and never calls the API — so the number shown to visitors is fictional and drifts
from the OBS overlay.

Constraints inherited from the existing codebase:

- **No application database.** All server state lives in Airtable, accessed via a
  hand-rolled REST client (`src/lib/airtable.ts`, `airtableRequest`), never an SDK.
  The `AIRTABLE_PAT` never reaches the browser. Each logical store is one table
  selected by its own env var (`AIRTABLE_TABLE_NAME`, `AIRTABLE_MESSAGES_TABLE_NAME`,
  `AIRTABLE_REDEMPTIONS_TABLE_NAME`).
- **Admin identity** is resolved as `getSession()` / `getSessionFromRequest(request)`
  -> `getIdentity(access_token)` -> `isAdminEmail(primary_email)`, with the allowlist
  in `ADMIN_EMAILS`. `app/api/admin/review/route.ts` is the reference implementation.
- **`/admin` is already taken** by the submission review queue
  (`app/admin/page.tsx`, from `add-submission-dashboard`, implemented but un-archived).
- The `Approved` Airtable field may still be missing on the live table;
  `countApprovedHours()` already degrades to `0` in that case.

## Goals / Non-Goals

**Goals:**
- A host can add or remove time from the timer by hand — quick +20 / -20 buttons and
  a custom signed amount — and see the effect immediately on `/obs-timer` and the
  homepage.
- The manual adjustment survives redeploys and function cold starts (persisted, not
  in-memory).
- The homepage countdown shows the same instant as the OBS overlay.
- Reuse the existing Airtable + admin-identity patterns exactly; no new
  infrastructure, no new auth surface.

**Non-Goals:**
- No realtime push (SSE/websocket). Polling every 5s matches `/obs-timer` today.
- No per-change audit log / attribution UI (who changed what when). The store keeps
  only the current total. Can be added later if needed.
- No absolute "set the deadline to exactly T" mode — only relative deltas + reset.
- No concurrency-hardened atomic increment. A single host clicking buttons does not
  need it (see Risks).
- No change to `/obs-timer` page code — it already renders whatever deadline the API
  returns.
- No merge of the timer dashboard into the existing `/admin` review page UI beyond a
  link.

## Decisions

### 1. Deadline gains one stored term; approved-hours stays live

`GET /api/obs/timer` becomes:

```
deadline = STREAM_START_AT
         + TIMER_INITIAL_MINUTES
         + approvedHours * TIMER_MINUTES_PER_HOUR   (still live from Airtable)
         + adjustmentMinutes                        (NEW, stored in Airtable)
```

This explicitly overturns `add-obs-overlays` Decision 1's "never a stored/mutated
value" for the deadline. The rationale for that decision was avoiding a new store and
avoiding coupling to the review handler — the first no longer holds once a manual
knob is a product requirement, and the second still holds (the review handler is
untouched; the adjustment is written only by the new admin endpoint). Approved-hours
remains a pure live read, so the "self-healing after redeploy / crash" property is
preserved for that term.

- *Alternative considered:* store the whole deadline and mutate it on every approval
  and every admin action. Rejected — reintroduces the dedup/idempotency problem
  Decision 1 avoided and couples to `/api/admin/review`.
- *Alternative considered:* keep the adjustment purely client-side in the admin
  browser. Rejected — would not affect `/obs-timer` or other visitors, defeating the
  purpose.

### 2. Storage: a dedicated single-row Airtable "config" table

Add `AIRTABLE_CONFIG_TABLE_NAME` (e.g. `Stream Config`) with columns `Key` (single
line text) and `Value` (number). The adjustment lives in the row `Key = "timerAdjustmentMinutes"`.
`src/lib/airtable.ts` gains:

- `getTimerAdjustmentMinutes(): Promise<number>` — query `filterByFormula={Key}='timerAdjustmentMinutes'`,
  `maxRecords=1`; return `Number(record.fields.Value)` or `0` if no row / blank / NaN.
- `setTimerAdjustmentMinutes(value: number): Promise<void>` — if the row exists,
  `PATCH` its `Value`; else `POST` a new row. (Record id can be cached per lambda
  instance but a fresh lookup each write is fine at this volume.)

- *Alternative considered:* reuse the `YSWS Project Submission` table with a magic
  record. Rejected — pollutes the submissions table and its queries.
- *Alternative considered:* Upstash KV / Redis via the Vercel Marketplace, using
  `INCRBY` for a truly atomic increment. Rejected for now — introduces a new
  integration and secret for a store that is written a handful of times per stream;
  the whole rest of the app is Airtable. Noted as the upgrade path if write
  contention ever becomes real.
- *Alternative considered:* a generic `getConfig(key)/setConfig(key, value)` pair
  instead of timer-specific helpers. Reasonable and slightly more future-proof;
  either is acceptable at implementation time. The spec only requires the
  timer-adjustment behavior.

### 3. Accumulating signed delta, with an explicit reset

`POST /api/admin/timer` takes `{ deltaMinutes: <integer> }` and does a
read-add-write: `next = current + deltaMinutes`. `{ reset: true }` writes `0`.
The dashboard's "+20" / "-20" buttons send `deltaMinutes: 20 / -20`; the custom
field sends whatever signed integer the admin enters.

- The running total is always shown prominently on the dashboard so it cannot drift
  untracked, and "Reset to 0" is one click.
- *Alternative considered:* absolute "bonus minutes = N" input. Rejected — clunkier
  for the common case (quick nudges mid-stream), and the user asked for
  "increments" / "decrease by".
- **No clamping.** A negative-enough adjustment can pull the deadline before `now`;
  both `/obs-timer` and the homepage already render expired as `00:00:00`. Clamping
  to "not before now" was considered and rejected as surprising (it would silently
  swallow part of a delta); the dashboard instead shows the resulting remaining time
  so the admin sees a zero/expired result before it matters.

### 4. Route placement: `/admin/timer`, linked from `/admin`

New server component `app/admin/timer/page.tsx` mirrors `app/admin/page.tsx`'s gate
(`getSession()` -> `redirect("/api/auth/login")` if none; `getIdentity` +
`isAdminEmail` -> `redirect("/")` or the review page if not an admin). It renders a
client component (`app/components/admin/TimerControls.tsx`) that holds the interactive
state. A link to `/admin/timer` is added to the existing `/admin` page.

- *Alternative considered:* add the controls as a section on the existing `/admin`
  review page. Rejected — keeps the review queue focused; a separate route is
  cleaner and is what was requested ("a /admin route that has a dashboard").

### 5. API shape

`app/api/admin/timer/route.ts`:

- `GET` — admin-gated. Returns
  `{ adjustmentMinutes, deadline, approvedHours, initialMinutes, minutesPerHour, streamStartAt }`
  (or `503 stream_not_configured` if `STREAM_START_AT` is unset/invalid, matching
  `/api/obs/timer`). Lets the dashboard render the full breakdown without a second
  call to `/api/obs/timer`.
- `POST` — admin-gated. Body `{ deltaMinutes: number }` or `{ reset: true }`.
  Validates `deltaMinutes` is a finite integer (`Number.isInteger`); otherwise `400
  invalid_request`. Applies the change, returns the same shape as `GET`.
- `export const dynamic = "force-dynamic"` (no caching), like the obs timer route.

`GET /api/obs/timer` is modified to call `getTimerAdjustmentMinutes()` alongside
`countApprovedHours()` (can be `Promise.all`), add the term to the deadline, and
include `adjustmentMinutes` in the JSON. If the config read throws (table missing),
it degrades to `0` and logs a warning — same tolerance strategy the route already
uses for the `Approved` field.

### 6. Homepage rewired to the API

`app/page.tsx` replaces its local countdown with the same pattern `/obs-timer` uses:
`useState<number | null>(deadline)`, a `sync()` that fetches `/api/obs/timer`
(`cache: "no-store"`), a 5s resync interval, and a 1s tick. `remaining = deadline -
now`; format into days / hours / minutes / seconds for the existing DaisyUI
`countdown` markup. States:

- `deadline === null` (not loaded yet) -> render `--` / zeros in the four slots.
- `503 stream_not_configured` -> same neutral placeholder; do not start ticking.
- `remaining <= 0` -> render all zeros (`Math.max(0, ...)`), no negatives.

The "every hour building increases the stream by 20 minutes" copy stays; only the
numbers become real.

## Risks / Trade-offs

- **[Read-add-write race]** Two near-simultaneous writes (double-click, or two admin
  tabs) could lose one delta. -> The dashboard disables the buttons while a request
  is in flight; single-admin usage makes this near-impossible. Documented upgrade
  path: move the value to Upstash and use `INCRBY` (Decision 2).
- **[Airtable latency on the obs timer hot path]** Adding a second Airtable read to
  `GET /api/obs/timer` (now `countApprovedHours` + `getTimerAdjustmentMinutes`).
  -> Run them with `Promise.all` so it is one round-trip of wall time, not two; the
  config query is a single-record lookup. Poll interval stays 5s.
- **[Config table/row missing in an environment]** -> Reads default to `0` and log a
  warning; the first successful `POST` creates the row. `/api/obs/timer` never fails
  because of this.
- **[Negative adjustment hides real remaining time]** An admin over-subtracts and the
  stream shows `00:00:00` on air. -> No clamping by design (Decision 3), but the
  dashboard shows the resulting remaining time immediately after each action so the
  mistake is visible before it matters; "Reset to 0" recovers instantly.
- **[Homepage now depends on an API call]** If `/api/obs/timer` is down, the homepage
  countdown shows placeholder zeros instead of a (fake but moving) number. -> Accept;
  a truthful placeholder beats a fabricated countdown, and the endpoint is already a
  hard dependency of the OBS overlay.

## Migration Plan

1. Create the Airtable `Stream Config` table (columns `Key` text, `Value` number) in
   the base identified by `AIRTABLE_BASE_ID`. Optionally seed a row
   `Key = timerAdjustmentMinutes`, `Value = 0`.
2. Add `AIRTABLE_CONFIG_TABLE_NAME` to `.env.local` / production env.
3. Ship `src/lib/airtable.ts` helpers + `app/api/admin/timer/route.ts` +
   `/admin/timer` page. Verify the gate with a non-admin session (expect redirect /
   401 / 403).
4. Ship the `GET /api/obs/timer` change; confirm `/obs-timer` still renders and the
   response now carries `adjustmentMinutes`.
5. Ship the homepage rewire; confirm the homepage and `/obs-timer` agree.
6. Rollback: revert the `/api/obs/timer` and `app/page.tsx` changes; the new route
   and table can be left in place harmlessly (nothing reads the adjustment once the
   term is removed).

## Open Questions

- Table name / shape: dedicated `Stream Config` key-value table (assumed) vs. a
  single fixed config record in an existing table. Confirm at implementation.
- Do we want a lightweight audit trail (append a row per adjustment with admin email
  + timestamp) now, or defer? Deferred by default (Non-Goals).
- Where should a non-admin hitting `/admin/timer` land — `/` or `/api/auth/login`?
  The existing `/admin` page sends unauthenticated users to `/api/auth/login` and
  authenticated non-admins onward; mirror that.
