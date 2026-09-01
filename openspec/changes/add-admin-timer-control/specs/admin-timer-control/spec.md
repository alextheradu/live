## ADDED Requirements

### Requirement: Persisted timer adjustment value

The system SHALL persist a single signed integer `adjustmentMinutes` in Airtable
that represents a manual, host-controlled offset applied to the livestream timer
deadline. The value SHALL default to `0` when no stored value exists. The value
MAY be negative.

#### Scenario: No stored value yet

- **WHEN** the adjustment store has never been written
- **THEN** the system treats `adjustmentMinutes` as `0`
- **AND** `GET /api/obs/timer` computes the deadline with a zero adjustment term

#### Scenario: Value persists across requests and deploys

- **WHEN** an admin has set `adjustmentMinutes` to a non-zero value
- **THEN** subsequent requests to `GET /api/obs/timer` and `GET /api/admin/timer`
  reflect that stored value without further admin action

### Requirement: Deadline includes the adjustment term

`GET /api/obs/timer` SHALL compute the deadline as
`STREAM_START_AT + TIMER_INITIAL_MINUTES + approvedHours * TIMER_MINUTES_PER_HOUR
+ adjustmentMinutes` (all minute terms converted to milliseconds). Approved hours
SHALL remain a live value read on each request. The response body SHALL include
`adjustmentMinutes` alongside the existing `deadline` and `approvedHours` fields.

#### Scenario: Adjustment shifts the deadline forward

- **WHEN** `adjustmentMinutes` is `+40` and all other inputs are unchanged
- **THEN** the `deadline` returned by `GET /api/obs/timer` is 40 minutes later than
  it would be with a zero adjustment

#### Scenario: Adjustment shifts the deadline backward

- **WHEN** `adjustmentMinutes` is `-20` and all other inputs are unchanged
- **THEN** the `deadline` returned by `GET /api/obs/timer` is 20 minutes earlier than
  it would be with a zero adjustment

#### Scenario: Stream not configured

- **WHEN** `STREAM_START_AT` is missing or invalid
- **THEN** `GET /api/obs/timer` returns HTTP 503 with `{ "error": "stream_not_configured" }`
  regardless of the adjustment value

### Requirement: Admin identity gate for timer control

The `/admin/timer` page and all mutating `/api/admin/timer` requests SHALL be restricted to
authenticated users whose primary email is in the `ADMIN_EMAILS` allowlist, using the
same identity resolution as the existing admin review endpoint
(`getSessionFromRequest` -> `getIdentity` -> `isAdminEmail`).

#### Scenario: Unauthenticated request to the API

- **WHEN** a request to `GET` or `POST /api/admin/timer` has no valid session
- **THEN** the system responds with HTTP 401 and does not read or write the adjustment

#### Scenario: Authenticated non-admin request to the API

- **WHEN** a request to `POST /api/admin/timer` has a valid session whose primary
  email is not in `ADMIN_EMAILS`
- **THEN** the system responds with HTTP 403 and does not write the adjustment

#### Scenario: Non-admin loads the timer dashboard

- **WHEN** a user who is not an allowlisted admin navigates to `/admin/timer`
- **THEN** the page does not render the timer controls and redirects the user away
  (e.g. to the homepage or sign-in)

### Requirement: Read current timer state via admin API

`GET /api/admin/timer` SHALL return, for an authorized admin, the current
`adjustmentMinutes`, the computed `deadline`, the current `approvedHours`, and the
constituent offsets (`initialMinutes`, `minutesPerHour`) needed to display a
breakdown of how the deadline is composed.

#### Scenario: Admin fetches current state

- **WHEN** an authorized admin sends `GET /api/admin/timer`
- **THEN** the response includes `adjustmentMinutes`, `deadline`, `approvedHours`,
  and the offset values used in the deadline formula

### Requirement: Adjust the timer by a delta

`POST /api/admin/timer` SHALL accept a JSON body `{ "deltaMinutes": <integer> }` and,
for an authorized admin, add `deltaMinutes` to the stored `adjustmentMinutes` as a
read-add-write operation. `deltaMinutes` MUST be a finite integer; non-integer,
missing, `NaN`, or non-numeric values SHALL be rejected with HTTP 400. The response
SHALL return the new `adjustmentMinutes` and the recomputed `deadline`.

#### Scenario: Add 20 minutes

- **WHEN** an admin sends `POST /api/admin/timer` with `{ "deltaMinutes": 20 }` and
  the stored value is `0`
- **THEN** the stored `adjustmentMinutes` becomes `20`
- **AND** the response returns `adjustmentMinutes: 20` and the recomputed `deadline`

#### Scenario: Subtract 20 minutes repeatedly accumulates

- **WHEN** an admin sends two `POST /api/admin/timer` requests each with
  `{ "deltaMinutes": -20 }` starting from a stored value of `50`
- **THEN** the stored `adjustmentMinutes` becomes `10`

#### Scenario: Custom amount

- **WHEN** an admin sends `POST /api/admin/timer` with `{ "deltaMinutes": -7 }`
- **THEN** the delta is applied exactly as `-7` minutes

#### Scenario: Invalid delta

- **WHEN** an admin sends `POST /api/admin/timer` with a `deltaMinutes` that is
  missing, non-numeric, `NaN`, infinite, or fractional
- **THEN** the system responds with HTTP 400 and does not change the stored value

### Requirement: Reset the timer adjustment

`POST /api/admin/timer` SHALL support resetting the adjustment to `0`, either via a
body `{ "reset": true }` or an equivalent explicit request, for an authorized admin.
The response SHALL return `adjustmentMinutes: 0` and the recomputed `deadline`.

#### Scenario: Reset clears accumulated adjustment

- **WHEN** the stored `adjustmentMinutes` is `-60` and an admin sends a reset request
- **THEN** the stored `adjustmentMinutes` becomes `0`
- **AND** `GET /api/obs/timer` computes the deadline with no adjustment term

### Requirement: Admin dashboard controls

The `/admin/timer` page SHALL present, to an authorized admin: the current remaining time,
the target `deadline`, a breakdown of the deadline into its initial, approved-hours,
and manual-adjustment components, and controls to add 20 minutes, subtract 20
minutes, apply a custom signed minute amount, and reset the adjustment to zero. After
any successful control action the displayed values SHALL refresh to reflect the new
deadline.

#### Scenario: Add 20 from the dashboard

- **WHEN** an admin clicks the "+20 min" control
- **THEN** the page sends `POST /api/admin/timer` with `deltaMinutes: 20`
- **AND** on success the displayed adjustment total and remaining time update

#### Scenario: Custom amount from the dashboard

- **WHEN** an admin enters a custom value (e.g. `-15`) and submits it
- **THEN** the page sends `POST /api/admin/timer` with `deltaMinutes: -15`
- **AND** on success the displayed values update

#### Scenario: Failed action surfaces an error

- **WHEN** a control action returns a non-2xx response
- **THEN** the page shows an error indication and leaves the last known values in place

### Requirement: Homepage countdown synced to the real deadline

The homepage (`app/page.tsx`) SHALL count down to the `deadline` returned by
`GET /api/obs/timer` instead of a hardcoded local duration. It SHALL poll the endpoint
periodically so that approved-hours increases and admin adjustments are reflected
without a page reload. It SHALL render the remaining time broken into days, hours,
minutes, and seconds.

#### Scenario: Homepage matches the OBS overlay

- **WHEN** `GET /api/obs/timer` returns a given `deadline`
- **THEN** the homepage countdown and the `/obs-timer` overlay both count down to that
  same instant (within one poll interval)

#### Scenario: Admin adjustment reflected on the homepage

- **WHEN** an admin adds 20 minutes while the homepage is open
- **THEN** within one poll interval the homepage remaining time increases by
  approximately 20 minutes

#### Scenario: Stream not configured

- **WHEN** `GET /api/obs/timer` returns HTTP 503 `stream_not_configured`
- **THEN** the homepage shows a neutral placeholder (e.g. dashes / zeros) rather than
  a misleading running countdown

#### Scenario: Deadline already passed

- **WHEN** the `deadline` is in the past
- **THEN** the homepage displays a zeroed countdown and does not show negative values
