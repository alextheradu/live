## Context

The homepage (`app/page.tsx`, a `"use client"` component) polls `GET /api/obs/timer` every 5 seconds and renders a hero with a Twitch player iframe plus a countdown grid that counts to `data.deadline`. The route (`app/api/obs/timer/route.ts`) is a thin forwarder over `getTimerState()` in `src/lib/timer.ts`, which computes:

```
deadline = STREAM_START_AT
         + TIMER_INITIAL_MINUTES                       (~18h)
         + approvedHours * TIMER_MINUTES_PER_HOUR      (live Airtable read, 20 min/hr)
         + adjustmentMinutes                           (Airtable Stream Config, admin knob)
```

`getTimerState()` already returns `streamStartAt`, `initialMinutes`, `minutesPerHour`, `approvedHours`, and `adjustmentMinutes` in its `TimerState`; the route currently only forwards `deadline`, `approvedHours`, and `adjustmentMinutes`.

During the 7-day prelaunch window nothing is streaming, but the current hero implies the stream is live and counts down a blended `7d + 18h + submissions` number. We want an operator to swap in a prelaunch hero without editing app code, then swap back on launch day.

## Goals / Non-Goals

**Goals:**

- A single environment variable (`PRELAUNCH_MODE`) flips the homepage hero between prelaunch and live, effective on restart, no code edit.
- Prelaunch hero: one countdown to `STREAM_START_AT`, a non-counting "stream length so far" figure, and copy that shipping keeps adding time after launch.
- Reuse the existing `/api/obs/timer` poll and `getTimerState()` math — no second endpoint, no new client fetch loop.
- Live hero and all existing consumers (`/admin/timer`, OBS overlay pages) unchanged.

**Non-Goals:**

- Auto-switching based on the clock (`now >= STREAM_START_AT`). The toggle is deliberately manual.
- Setting `STREAM_START_AT` itself, or any "7 days from now" computation — the operator does that.
- Restyling the page, changing the "how it works"/FAQ sections, or touching the OBS overlay.
- Persisting the toggle in Airtable / making it changeable without a restart.

## Decisions

### Decision 1: Toggle is a plain environment variable read server-side, surfaced via the API

`PRELAUNCH_MODE` is read in the route handler (`process.env.PRELAUNCH_MODE`) and returned as a boolean `prelaunch` field on the `/api/obs/timer` JSON. The client branches on `data.prelaunch`.

- **Why:** `app/page.tsx` is a client component and cannot read server env directly. The page already polls this route every 5s, so threading one more boolean through it adds no request, no new caching concern, and keeps a single source of truth. Restart-to-apply matches the "manual toggle" requirement.
- **Alternatives considered:**
  - `NEXT_PUBLIC_PRELAUNCH_MODE` read directly in the client — leaks the flag into the bundle, needs a rebuild (not just restart) to change on some hosts, and splits config between client and server.
  - Convert `page.tsx` to a server component that passes a prop to a small client `<Countdown>` — larger refactor of a working file for no functional gain.
  - Store the flag in the Airtable Stream Config table next to `adjustmentMinutes` — changeable without restart, but more moving parts than asked for and adds an Airtable failure path to the homepage's mode decision. Explicitly a non-goal.

### Decision 2: Normalize the flag as `value.toLowerCase() === "true"`

Unset, empty, `0`, `false`, or anything else means live mode. Only `true`/`TRUE` enables prelaunch.

- **Why:** Fail safe toward the live/normal path; avoids "truthy string" foot-guns where `PRELAUNCH_MODE=false` would otherwise enable it.

### Decision 3: Add `bankedMinutes` as a precomputed field on the API

The route returns `bankedMinutes = initialMinutes + approvedHours * minutesPerHour + adjustmentMinutes`, computed from values `getTimerState()` already provides. The client formats it as `Xh Ym`.

- **Why:** Keeps the arithmetic in one place (server, alongside the deadline formula it mirrors) rather than re-deriving it in the client from three separate fields. The client only needs a format helper.
- **Alternative:** Return `initialMinutes` and `minutesPerHour` and let the client compute — more fields, duplicated formula, easy to drift from the deadline math.

### Decision 4: Prelaunch hero replaces only the hero `<section>`, gated by a single conditional

In `page.tsx`, the first `<section>` (Twitch iframe + `<h1>` + CTA row + countdown grid) becomes `{prelaunch ? <PrelaunchHero…/> : <LiveHero…/>}` (inline JSX or a local component). The countdown grid markup (the `days/hours/min/sec` map with the daisyUI `countdown` spans) is reused, pointed at `streamStartAt` instead of `deadline`. The existing `hasDeadline`/placeholder fallback pattern is reused for the "API unavailable" case.

- **Why:** Minimal blast radius; the live path is byte-for-byte the same when the flag is off. Reusing the countdown markup keeps visual consistency and avoids a second implementation of the day/hour/min/sec breakdown.

### Decision 5: "Stream length so far" is display-only, refreshed by the existing 5s poll

It renders `formatMinutes(bankedMinutes)` from the latest poll response. No per-second `setInterval` for this value — it only changes when an approval lands in Airtable, which the 5s resync already picks up.

- **Why:** Matches the requirement ("just say the total length"), avoids implying it's a live ticking clock, and needs no extra timer.

## Risks / Trade-offs

- **Forgetting to flip `PRELAUNCH_MODE` on launch day** → the stream goes live but the homepage still hides the player. Mitigation: call it out in the tasks/runbook; the live hero is the default so the failure mode is only "stale prelaunch", not a broken page.
- **`PRELAUNCH_MODE=false` misread as enabled** → mitigated by Decision 2 (strict `=== "true"`).
- **Countdown to a past `streamStartAt` during prelaunch** (operator set it too close) → clamp to zero using the existing `Math.max(0, …)` pattern; never show negatives.
- **API shape change breaking a consumer** → additive only; `deadline`, `approvedHours`, `adjustmentMinutes`, and the 503 path are untouched, so `/admin/timer` and the OBS overlay are unaffected.
- **`bankedMinutes` when `STREAM_START_AT` is unset** → the route still 503s before computing anything (existing `StreamNotConfiguredError` path); the client keeps its placeholder. No new failure mode.
- **Env var not available at runtime on the host** → treated as unset → live mode. Acceptable default.

## Migration Plan

1. Ship the code change (route + homepage) with `PRELAUNCH_MODE` unset — behavior is identical to today.
2. Operator sets `STREAM_START_AT` to ~7 days out and `PRELAUNCH_MODE=true`, then restarts. Homepage shows the prelaunch hero.
3. On launch day: operator sets `PRELAUNCH_MODE=false` (or removes it) and restarts. Homepage returns to the live hero.
4. **Rollback:** unset `PRELAUNCH_MODE` and restart; no data or schema changes to revert.

## Open Questions

- Exact prelaunch copy wording for the "keep shipping after launch" message — placeholder text is fine for the proposal; final copy can be tuned during implementation or by the operator.
- Whether the prelaunch hero keeps the secondary "see it all live" Twitch link (harmless but points at an offline channel). Leaning toward dropping it in prelaunch mode.
