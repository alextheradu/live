## ADDED Requirements

### Requirement: Countdown deadline is derived from stream start, base duration, and live approved hours
The system SHALL compute the timer's deadline as `STREAM_START_AT + TIMER_INITIAL_MINUTES + (approvedHours × TIMER_MINUTES_PER_HOUR)`, where `approvedHours` is the sum of the hours-claimed field across all `YSWS Project Submission` records with `Approved` checked, read live from Airtable on each request. This matches the site's existing stated rule that every hour of an approved project extends the stream by a fixed number of minutes.

#### Scenario: No approvals yet
- **WHEN** `/api/obs/timer` is requested and zero records have `Approved` checked
- **THEN** the returned deadline equals `STREAM_START_AT + TIMER_INITIAL_MINUTES`

#### Scenario: An admin approves a new project
- **WHEN** an admin checks `Approved` on a submission with `H` hours claimed in the admin dashboard, and `/api/obs/timer` is requested afterward
- **THEN** the returned deadline is `H × TIMER_MINUTES_PER_HOUR` minutes later than it was before that approval, without requiring the project to have been synced to the YSWS Unified pipeline

#### Scenario: An approved project has no recorded hours
- **WHEN** an admin approves a submission whose hours-claimed field is blank
- **THEN** that record contributes 0 minutes to the deadline rather than causing an error

### Requirement: Timer route returns only public, non-identifying data
`/api/obs/timer` SHALL return only the computed deadline (ISO timestamp) and the total approved hours. It SHALL NOT return any submission-level field (names, URLs, per-project hours, GitHub usernames, etc.).

#### Scenario: Timer endpoint response shape
- **WHEN** `/api/obs/timer` is requested
- **THEN** the JSON response contains only `deadline` and `approvedHours`

### Requirement: Timer route requires no authentication
`/api/obs/timer` and `/obs-timer` SHALL be reachable without any session, login, or API key, so they can be loaded directly as an OBS Browser Source URL.

#### Scenario: Unauthenticated request
- **WHEN** `/obs-timer` or `/api/obs/timer` is requested with no session cookie or credentials
- **THEN** the system responds normally with the current deadline

### Requirement: `/obs-timer` renders a live-updating countdown suitable for OBS compositing
The system SHALL render `/obs-timer` as a page with a transparent background and no shared app navigation, displaying a countdown (e.g. HH:MM:SS) computed from the deadline and updating at least once per second on the client, re-syncing against the server periodically to correct drift.

#### Scenario: Page loads mid-countdown
- **WHEN** `/obs-timer` is loaded
- **THEN** it fetches the current deadline and immediately displays the correct remaining time, then continues counting down client-side

#### Scenario: Deadline passes while the page is open
- **WHEN** the countdown reaches zero
- **THEN** the page displays a zero/expired state rather than a negative time, until a subsequent poll returns a later deadline
