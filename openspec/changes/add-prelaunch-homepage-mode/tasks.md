## 1. Timer API — prelaunch fields

- [x] 1.1 In `app/api/obs/timer/route.ts`, read `process.env.PRELAUNCH_MODE` and normalize to a boolean with a strict `String(value).toLowerCase() === "true"` check
- [x] 1.2 Compute `bankedMinutes` from the `getTimerState()` result: `initialMinutes + approvedHours * minutesPerHour + adjustmentMinutes`
- [x] 1.3 Add `prelaunch`, `streamStartAt` (from `state.streamStartAt`), and `bankedMinutes` to the `NextResponse.json({...})` body; leave `deadline`, `approvedHours`, `adjustmentMinutes` and the `503 stream_not_configured` path unchanged
- [x] 1.4 Manually verify: `curl /api/obs/timer` — with `PRELAUNCH_MODE=false` (current) returns `prelaunch:false`, `streamStartAt`, `bankedMinutes:248` (= 60 + 7.4*20 + 40). `prelaunch:true` and `503` paths follow the same env/error branch; re-check after the operator flips the flag.

## 2. Homepage — prelaunch hero

- [x] 2.1 In `app/page.tsx`, read `prelaunch`, `streamStartAt`, `bankedMinutes` from the `/api/obs/timer` response in the existing `sync()` poll and hold them in state
- [x] 2.2 Add a `formatMinutes(mins)` helper that renders `Xh Ym` (e.g. `18h 40m`)
- [x] 2.3 Extract the shared countdown grid into `<CountdownGrid targetMs now />` (daisyUI `countdown` spans + `--` placeholder), used for both `deadline` and `streamStartAt`
- [x] 2.4 Gate the hero on `prelaunch`: prelaunch hero when true, existing live hero (Twitch iframe + `<h1>` + CTA row + countdown to `deadline`) when false
- [x] 2.5 Prelaunch hero content: "stream starts in" + countdown to `streamStartAt`, "stream length so far — {formatMinutes(bankedMinutes)}" line (display-only, no per-second interval), "keeps counting after the stream starts" copy, and the "Ship now" CTA to `/dashboard`
- [x] 2.6 Twitch iframe not rendered in prelaunch mode; secondary "see it all live" link omitted in prelaunch (per design Open Questions default)
- [x] 2.7 `CountdownGrid` reuses the `--` placeholder when `targetMs` is null (non-OK / failed `/api/obs/timer`), so no fabricated countdown
- [x] 2.8 "Here's how it works", FAQ, and `<Footer />` sections left unchanged in both modes

## 3. Verification

- [x] 3.1 With `PRELAUNCH_MODE=false`: homepage renders the current live hero ("livestream don't stop…", "Time is ticking…"), no application error; `tsc --noEmit` clean
- [ ] 3.2 With `PRELAUNCH_MODE=true` and a future `STREAM_START_AT`: iframe absent, countdown ticks down to the start instant, "stream length so far" shows the banked figure — *pending operator enabling the flag + restart*
- [ ] 3.3 Approve/adjust an entry so `bankedMinutes` grows; confirm the prelaunch figure updates within one poll cycle without a page reload — *pending, same as 3.2*
- [ ] 3.4 Set `STREAM_START_AT` to a past instant; confirm the prelaunch countdown clamps to zero with no negative values (`Math.max(0, …)` in `CountdownGrid`) — *pending, same as 3.2*
- [ ] 3.5 Flip `PRELAUNCH_MODE` back to `false` and restart; confirm the live hero returns — *pending, same as 3.2*
- [x] 3.6 `/api/obs/timer` change is additive — `deadline`, `approvedHours`, `adjustmentMinutes`, and the 503 path are untouched, so `/admin/timer` and the OBS overlay consumers are unaffected

## 4. Docs / handoff

- [x] 4.1 Documented `PRELAUNCH_MODE` (values, restart-to-apply) in `.env.local` next to the other timer env vars; added `PRELAUNCH_MODE=false`
- [x] 4.2 Launch-day reminder added inline in `.env.local`: set `PRELAUNCH_MODE=false` and restart when the stream goes live
