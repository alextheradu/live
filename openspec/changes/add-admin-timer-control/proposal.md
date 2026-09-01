## Why

The livestream timer deadline is currently a pure function of stream start, a fixed
initial offset, and live approved hours — there is no way for the host to nudge it by
hand (add time for a sponsor read, cut time, correct a mistake). Separately, the
homepage countdown is a fake local 24-hour counter that is disconnected from the real
timer, so visitors see a number that does not match the OBS overlay or reality.

## What Changes

- Add a new persisted, admin-controlled `adjustmentMinutes` value (an accumulating
  signed integer) stored in Airtable.
- Add a gated timer dashboard at `/admin/timer` (the `/admin` path is already the
  submission review queue from `add-submission-dashboard`), allowlisted via
  `ADMIN_EMAILS` with the same identity check as the existing admin review API, with
  controls to add 20 minutes, subtract 20 minutes, apply a custom signed amount, and
  reset the adjustment to zero. The dashboard shows the current deadline, remaining
  time, and a breakdown of how it is composed, and is linked from the existing
  `/admin` page.
- Add `GET`/`POST` `/api/admin/timer` — `GET` returns the current adjustment and
  deadline breakdown; `POST` applies a delta (or reset) after an admin identity check.
- **BREAKING (internal design contract):** `GET /api/obs/timer` now folds
  `adjustmentMinutes` into the computed deadline. This overturns `add-obs-overlays`
  design Decision 1 ("deadline is never a stored/mutated value") — approved-hours
  stays live, but the deadline now also carries one stored term. The response gains
  an `adjustmentMinutes` field.
- Rewire the homepage countdown (`app/page.tsx`) to poll `/api/obs/timer` and count
  down to the real `deadline`, replacing the hardcoded `24 * 60 * 60` local counter.
  Define its behavior when the stream is not configured or the deadline has passed.

## Capabilities

### New Capabilities

- `admin-timer-control`: The `/admin` dashboard and `/api/admin/timer` endpoint for
  viewing and manually adjusting the livestream timer; the Airtable-backed
  `adjustmentMinutes` store; the rule that `GET /api/obs/timer` includes the
  adjustment in the deadline; and the homepage countdown syncing to that deadline.

### Modified Capabilities

<!-- None. The obs-timer capability spec from add-obs-overlays is not yet archived
     into openspec/specs/, so the deadline-formula change is captured in the new
     admin-timer-control spec instead of as a delta. -->

## Impact

- **New code:** `app/admin/timer/page.tsx` (gated dashboard) + a client controls
  component, `app/api/admin/timer/route.ts`.
- **Modified code:** `app/api/obs/timer/route.ts` (add adjustment term + response
  field), `app/page.tsx` (homepage countdown rewired to the API), `src/lib/airtable.ts`
  (read/write the adjustment value).
- **Airtable:** a new single-value config store — a dedicated `Stream Config` table
  (or a known config record) holding `Timer Adjustment Minutes`. Requires manual
  Airtable schema setup, like the existing `Approved` field.
- **Auth/identity:** reuses `getSessionFromRequest` + `getIdentity` + `isAdminEmail`
  and the `ADMIN_EMAILS` env var; adds a `cookies()`-based session read for the
  server-rendered `/admin` page.
- **Unaffected:** `/obs-timer` page needs no change — it already polls
  `/api/obs/timer` and renders whatever deadline it returns.
