## 1. Airtable config store (manual + lib)

- [ ] 1.1 Create the `Stream Config` table in the Airtable base (`AIRTABLE_BASE_ID`) with columns `Key` (single line text) and `Value` (number); optionally seed a row `Key = timerAdjustmentMinutes`, `Value = 0`. (Manual, outside the codebase.)
- [x] 1.2 Add `AIRTABLE_CONFIG_TABLE_NAME` to `.env.local` and document it in `.env.example` / production env.
- [x] 1.3 In `src/lib/airtable.ts`, add a config-table request config helper mirroring the existing per-table config functions (uses `AIRTABLE_PAT`, `AIRTABLE_BASE_ID`, `AIRTABLE_CONFIG_TABLE_NAME`).
- [x] 1.4 Add `getTimerAdjustmentMinutes(): Promise<number>` — query `filterByFormula={Key}='timerAdjustmentMinutes'`, `maxRecords=1`; return `Number(Value)` or `0` when no row / blank / `NaN`.
- [x] 1.5 Add `setTimerAdjustmentMinutes(value: number): Promise<void>` — `PATCH` the existing row's `Value`, or `POST` a new row if none exists.

## 2. Modify the OBS timer route

- [x] 2.1 In `app/api/obs/timer/route.ts`, fetch `getTimerAdjustmentMinutes()` alongside `countApprovedHours()` via `Promise.all`. _(Both routes now share `src/lib/timer.ts::getTimerState`, which does this `Promise.all`.)_
- [x] 2.2 Add `adjustmentMinutes * 60_000` to the computed `deadline`.
- [x] 2.3 Wrap the adjustment read so a thrown error (missing table) degrades to `0` and logs a warning, matching the route's existing tolerance for the `Approved` field.
- [x] 2.4 Add `adjustmentMinutes` to the JSON response alongside `deadline` and `approvedHours`.

## 3. Admin timer API

- [x] 3.1 Create `app/api/admin/timer/route.ts` with `export const dynamic = "force-dynamic"`.
- [x] 3.2 Add a shared admin gate (session via `getSessionFromRequest` -> `getIdentity` -> `isAdminEmail`): 401 when no session, 403 when not an allowlisted admin. Mirror `app/api/admin/review/route.ts`.
- [x] 3.3 Implement a helper that builds the state payload `{ adjustmentMinutes, deadline, approvedHours, initialMinutes, minutesPerHour, streamStartAt }`, returning `503 stream_not_configured` when `STREAM_START_AT` is unset/invalid. _(`src/lib/timer.ts::getTimerState` + `StreamNotConfiguredError`, shared with the OBS route.)_
- [x] 3.4 `GET` — gate, then return the state payload.
- [x] 3.5 `POST` — gate; parse body. If `{ reset: true }`, set adjustment to `0`. Else require `deltaMinutes` to be a finite integer (`Number.isInteger`) or return `400 invalid_request`; compute `next = current + deltaMinutes`, persist via `setTimerAdjustmentMinutes`, return the updated state payload.

## 4. Admin timer dashboard page

- [x] 4.1 Create `app/admin/timer/page.tsx` as a server component; gate with `getSession()` -> `redirect("/api/auth/login")` if no session, and `getIdentity` + `isAdminEmail` -> redirect (match `app/admin/page.tsx`'s non-admin behavior) otherwise.
- [x] 4.2 On the server, fetch the initial timer state (call the state helper directly or `fetch` the admin API) and pass it to the client component. _(Calls `getTimerState()` directly; renders a "not configured" message on `StreamNotConfiguredError`.)_
- [x] 4.3 Create `app/components/admin/TimerControls.tsx` (client): show target `deadline`, live remaining time (1s tick), and a breakdown into initial / approved-hours / manual-adjustment minutes.
- [x] 4.4 Add controls: "+20 min" and "-20 min" buttons (`POST { deltaMinutes: ±20 }`), a custom signed-integer input with an Apply button, and a "Reset to 0" button (`POST { reset: true }`).
- [x] 4.5 Disable all controls while a request is in flight; on success replace displayed state with the response; on non-2xx show an error and keep the last known values.
- [x] 4.6 Add a link to `/admin/timer` from `app/admin/page.tsx`.

## 5. Homepage countdown sync

- [x] 5.1 In `app/page.tsx`, replace the `useState(24*60*60)` local counter with `deadline: number | null` state plus a `now` tick.
- [x] 5.2 Add a `sync()` that fetches `/api/obs/timer` with `cache: "no-store"`, sets `deadline` from `data.deadline`; add a 5s resync interval and a 1s tick interval, cleaning both up on unmount.
- [x] 5.3 Compute `remaining = Math.max(0, deadline - now)` and derive days / hours / minutes / seconds for the existing DaisyUI `countdown` markup.
- [x] 5.4 Render a neutral placeholder (dashes / zeros, not ticking) when `deadline` is null or the endpoint returns `503 stream_not_configured`; render all zeros when `remaining <= 0`.

## 6. Verification

- [ ] 6.1 As a non-admin session: `GET`/`POST /api/admin/timer` return 401/403 and `/admin/timer` redirects. _(Manual — needs a running app + a non-admin session cookie.)_
- [ ] 6.2 As an admin: `+20` then `-20` leaves the stored value unchanged; `Reset` zeroes it; a fractional/non-numeric `deltaMinutes` returns 400. _(Manual — needs the Airtable `Stream Config` table from 1.1 + an admin session.)_
- [ ] 6.3 After an adjustment, `GET /api/obs/timer` `deadline` shifts by the expected minutes and `/obs-timer` reflects it within one poll. _(Manual.)_
- [ ] 6.4 The homepage countdown and `/obs-timer` count down to the same instant, and the homepage reacts to an admin adjustment within one poll interval. _(Manual.)_
- [ ] 6.5 With `STREAM_START_AT` unset, `/api/obs/timer` and `GET /api/admin/timer` return `503 stream_not_configured` and the homepage shows the placeholder. _(Manual.)_
- [x] 6.6 Update `add-obs-overlays` design.md (or note in this change's record) that Decision 1 is superseded for the deadline's manual-adjustment term.

**Build/typecheck verification done in-session:** `npx tsc --noEmit` passes clean;
`npx next build` succeeds with `/admin/timer` + `/api/admin/timer` registered as dynamic
routes; the new files add no ESLint errors (the one `app/page.tsx:21` `set-state-in-effect`
error is pre-existing on the untouched `setHostname` line).
