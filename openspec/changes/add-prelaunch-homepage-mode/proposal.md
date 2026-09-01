## Why

The project is entering a 7-day prelaunch window: submissions are open but nothing is streaming yet, so the goal is to bank a baseline of approved projects before day one. The current homepage hero shows a dead Twitch player and a countdown to the stream-*end* deadline (`STREAM_START_AT + 18h + submission hours`), which reads as if the stream is already live. Prelaunch visitors need a page that clearly says "stream starts in N days," shows how much stream time has already been banked, and makes clear that shipping keeps mattering after launch day.

## What Changes

- Add a manual `PRELAUNCH_MODE` toggle (environment variable) that switches the homepage hero between two states without a code edit or redeploy of app code — flip the env var and restart.
- **Prelaunch hero** (when `PRELAUNCH_MODE` is on):
  - Hide the Twitch player iframe.
  - Show a single countdown to `STREAM_START_AT` ("stream starts in Dd HH:MM:SS").
  - Show a static "stream length so far" figure — `TIMER_INITIAL_MINUTES + approvedHours * TIMER_MINUTES_PER_HOUR + adjustmentMinutes`, formatted like `18h 40m` — that refreshes on the existing 5-second poll. This is a display value, not a countdown.
  - Show copy making explicit that every approved hour keeps adding stream time *after* launch day, so shipping past the 7-day mark keeps the stream going.
  - Keep the "Ship your project" call to action.
- **Live hero** (when `PRELAUNCH_MODE` is off): unchanged — Twitch iframe plus the countdown to the stream-end `deadline`.
- Extend the `GET /api/obs/timer` JSON response with `prelaunch` (boolean, from `process.env.PRELAUNCH_MODE`), `streamStartAt` (ISO string), and `bankedMinutes` (number). The underlying values are already computed by `getTimerState()`; only the route payload and the homepage consumer change.
- The sections below the hero ("Here's how it works", FAQ, footer) are untouched.
- No change to `src/lib/timer.ts` deadline math, the Airtable integration, the `/admin/timer` dashboard, or the OBS overlay pages.

## Capabilities

### New Capabilities
- `prelaunch-homepage-mode`: An operator-controlled toggle and the prelaunch homepage hero it drives — countdown to stream start, banked stream-length display, "keep shipping" messaging — plus the `/api/obs/timer` fields that feed it.

### Modified Capabilities
<!-- None. The live-mode homepage and existing timer behavior are unchanged; the prelaunch view is additive and gated behind an off-by-default toggle. -->

## Impact

- **Code**:
  - `app/api/obs/timer/route.ts` — add `prelaunch`, `streamStartAt`, `bankedMinutes` to the response body.
  - `app/page.tsx` — branch the hero on `data.prelaunch`; add the prelaunch layout (countdown to `streamStartAt`, banked-minutes line, messaging) alongside the existing live layout.
- **Configuration**: new `PRELAUNCH_MODE` environment variable (unset / `false` = live behavior; `true` = prelaunch hero). Operator also sets `STREAM_START_AT` to a point ~7 days out (out of scope for this change).
- **APIs**: `GET /api/obs/timer` response gains three fields; existing fields and status codes are unchanged, so the OBS overlay and `/admin/timer` consumers keep working.
- **No dependencies, migrations, or data model changes.**
