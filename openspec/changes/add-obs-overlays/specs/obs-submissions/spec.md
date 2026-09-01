## ADDED Requirements

### Requirement: New submissions appear as chat-style lines with GitHub user and hours claimed
The system SHALL render each new `YSWS Project Submission` record as a line reading `[github user] submitted a project for [N] hours` on `/obs-submissions`, where `[github user]` is the record's GitHub username field and `[N]` is its `Hours Claimed` field.

#### Scenario: New submission arrives with hours recorded
- **WHEN** a new submission record is created with GitHub username `octocat` and `Hours Claimed = 12`
- **THEN** `/obs-submissions` shows the line `octocat submitted a project for 12 hours`

#### Scenario: New submission arrives with no hours recorded
- **WHEN** a new submission record is created with `Hours Claimed` blank
- **THEN** `/obs-submissions` shows a line for that submitter without a hours count, rather than omitting the submission or erroring

### Requirement: Resubmission does not re-announce an existing submission
Because `add-submission-dashboard` edits a submitter's existing record in place on resubmit, the system SHALL only announce a submission once, keyed off the record's creation time, not its last-modified time.

#### Scenario: A submitter resubmits after a rejection
- **WHEN** an existing submission record is updated (not newly created) after a reject-and-resubmit cycle
- **THEN** `/obs-submissions` does not show a second line for that submitter

### Requirement: Submissions route returns only public, non-identifying fields
`/api/obs/submissions` SHALL return only `githubUsername`, `hoursClaimed`, and `submittedAt` per record. It SHALL NOT return name, email, address, birthday, Code URL, Playable URL, or any other field from the submission record.

#### Scenario: Submissions endpoint response shape
- **WHEN** `/api/obs/submissions` is requested
- **THEN** each item in the JSON response contains only `githubUsername`, `hoursClaimed`, and `submittedAt`

### Requirement: Submissions route requires no authentication
`/api/obs/submissions` and `/obs-submissions` SHALL be reachable without any session, login, or API key.

#### Scenario: Unauthenticated request
- **WHEN** `/obs-submissions` or `/api/obs/submissions` is requested with no session cookie or credentials
- **THEN** the system responds normally with the current/new submissions

### Requirement: `/obs-submissions` backfills recent history on load, then polls forward
On load, `/obs-submissions` SHALL fetch and display the most recent submissions (bounded, e.g. the last 20) so the feed is non-empty immediately, then SHALL poll for submissions created after the newest one already shown, appending new ones as they arrive.

#### Scenario: Page loads mid-stream
- **WHEN** `/obs-submissions` is loaded partway through an event with existing submissions already recorded
- **THEN** the feed immediately shows the most recent prior submissions, not a blank list

#### Scenario: A new submission is created while the page is open
- **WHEN** a new submission record is created after the page has loaded
- **THEN** the new line appears in the feed without requiring a page reload
