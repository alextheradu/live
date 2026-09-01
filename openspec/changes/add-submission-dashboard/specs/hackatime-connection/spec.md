## ADDED Requirements

### Requirement: User connects Hackatime after HCA login
The system SHALL offer a Hackatime connect step to an HCA-authenticated user who has not yet connected Hackatime, using `HACKATIME_CLIENT_UID`/`HACKATIME_SECRET` for a dedicated OAuth hop.

#### Scenario: HCA-authenticated user has not connected Hackatime
- **WHEN** a user with a valid HCA session but no `hackatime_access_token` in their session visits the dashboard
- **THEN** the system prompts them to connect Hackatime before allowing a submission

#### Scenario: User starts the Hackatime connect flow
- **WHEN** the user initiates the Hackatime connect step
- **THEN** the system redirects to Hackatime's OAuth authorize endpoint with the configured client credentials

### Requirement: Hackatime callback stores the connection in the existing session
The system SHALL exchange the Hackatime authorization code for an access token server-side and merge it into the user's existing encrypted session cookie, without creating a separate session or database record.

#### Scenario: Successful Hackatime callback
- **WHEN** Hackatime redirects back with a valid authorization code
- **THEN** the system exchanges it server-side for a token and updates the session cookie to include `hackatime_access_token`

#### Scenario: Failed Hackatime callback
- **WHEN** the Hackatime token exchange fails
- **THEN** the system leaves the existing HCA session intact and reports the connection failure without granting submission access

### Requirement: Tracked hours and GitHub username are fetched server-side at read time
The system SHALL fetch the user's Hackatime projects (tracked hours per project) and GitHub username server-side using the stored Hackatime access token, and SHALL NOT trust a client-supplied hours value for any gating or record decision.

#### Scenario: Dashboard loads project options
- **WHEN** a Hackatime-connected user loads the submission dashboard
- **THEN** the system calls Hackatime's API server-side to list the user's tracked projects and displays them for selection, along with the GitHub username to autofill

#### Scenario: Submission time re-verification
- **WHEN** a submission is created or updated
- **THEN** the system re-fetches the selected project's tracked hours from Hackatime server-side rather than using any hours value sent by the client
