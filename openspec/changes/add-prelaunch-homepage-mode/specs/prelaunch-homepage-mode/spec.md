## ADDED Requirements

### Requirement: Operator-controlled prelaunch toggle

The system SHALL expose a `PRELAUNCH_MODE` environment variable that controls whether the homepage renders the prelaunch hero or the live hero. The value SHALL be treated as enabled only when it equals `true` (case-insensitive); any other value, including unset, SHALL be treated as disabled. Changing the toggle SHALL NOT require an application code change.

#### Scenario: Toggle enabled

- **WHEN** `PRELAUNCH_MODE` is set to `true` and `GET /api/obs/timer` is called
- **THEN** the response body includes `prelaunch: true`

#### Scenario: Toggle disabled or unset

- **WHEN** `PRELAUNCH_MODE` is unset, empty, or any value other than `true`
- **THEN** `GET /api/obs/timer` returns `prelaunch: false` and the homepage renders the existing live hero unchanged

### Requirement: Timer API exposes prelaunch fields

`GET /api/obs/timer` SHALL include `prelaunch` (boolean), `streamStartAt` (ISO 8601 string), and `bankedMinutes` (number) in its success response, in addition to the existing `deadline`, `approvedHours`, and `adjustmentMinutes` fields. `bankedMinutes` SHALL equal `TIMER_INITIAL_MINUTES + approvedHours * TIMER_MINUTES_PER_HOUR + adjustmentMinutes`. Existing fields, status codes, and the `503 stream_not_configured` behavior SHALL be unchanged.

#### Scenario: Stream configured

- **WHEN** `STREAM_START_AT` is a valid date and `GET /api/obs/timer` is called
- **THEN** the response is `200` with `streamStartAt` echoing the configured start instant and `bankedMinutes` reflecting the initial minutes plus weighted approved hours plus the stored adjustment

#### Scenario: Stream not configured

- **WHEN** `STREAM_START_AT` is missing or unparseable
- **THEN** the response is `503` with `{ "error": "stream_not_configured" }` and no prelaunch fields, matching current behavior

### Requirement: Prelaunch homepage hero

WHEN the homepage receives `prelaunch: true` from `/api/obs/timer`, it SHALL render a prelaunch hero instead of the live hero. The prelaunch hero SHALL:

- NOT render the Twitch player iframe.
- Render exactly one countdown, counting down to `streamStartAt`, broken into days, hours, minutes, and seconds.
- Render a static "stream length so far" figure derived from `bankedMinutes`, formatted as hours and minutes (e.g. `18h 40m`). This figure SHALL NOT count down; it SHALL refresh on the existing periodic poll of `/api/obs/timer`.
- Render copy stating that every approved hour of building adds stream time and that this continues after the stream start date, so shipping past the prelaunch window keeps the stream running.
- Keep the "Ship your project" call to action linking to the submission flow.

The sections below the hero ("Here's how it works", FAQ, footer) SHALL be unchanged in both modes.

#### Scenario: Prelaunch hero rendered

- **WHEN** the homepage loads and `/api/obs/timer` returns `prelaunch: true` with a future `streamStartAt`
- **THEN** the Twitch iframe is absent, a countdown to `streamStartAt` is shown, the "stream length so far" figure derived from `bankedMinutes` is shown, and "keep shipping after launch" copy is visible

#### Scenario: Banked figure updates without reload

- **WHEN** the prelaunch hero is displayed and a later poll of `/api/obs/timer` returns a larger `bankedMinutes`
- **THEN** the displayed "stream length so far" figure increases to match, without a full page reload

#### Scenario: Countdown reaches zero

- **WHEN** the prelaunch hero is displayed and `streamStartAt` is in the past
- **THEN** the countdown displays zero for all units and does not display negative values

#### Scenario: Timer API unavailable

- **WHEN** the homepage loads and `/api/obs/timer` returns a non-OK status or fails
- **THEN** the countdown falls back to a placeholder instead of a fabricated value, consistent with current live-mode handling

#### Scenario: Switching to full launch

- **WHEN** the operator sets `PRELAUNCH_MODE` to disabled and restarts the app
- **THEN** subsequent homepage loads render the live hero (Twitch iframe plus countdown to `deadline`) with no prelaunch elements
