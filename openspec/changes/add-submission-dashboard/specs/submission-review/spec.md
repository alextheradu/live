## ADDED Requirements

### Requirement: Admin queue shows only non-PII verification fields
The admin review screen SHALL display, per submission, only: a derived Telescreen Link, Code URL, Playable URL, Lapse Link(s), and Screenshot. It SHALL NOT display or transmit to the client First Name, Last Name, Email, Address, or Birthday for any submission.

#### Scenario: Admin loads the queue
- **WHEN** the allowlisted admin loads `/admin`
- **THEN** the server response and rendered page include only Telescreen Link, Code URL, Playable URL, Lapse Link(s), Screenshot, and review-state/action controls for each submission — no name, email, address, or birthday data is present anywhere in the payload

### Requirement: Telescreen Link is derived from the submitter's Hackatime ID
The system SHALL construct the Telescreen Link as `https://joe-cool.jollyy.dev/billy/overview?u=[hackatime id]`, where `[hackatime id]` is the record's `Justification - Submitter Hackatime ID` value, URL-encoded. The system SHALL treat this as an opaque external link and SHALL NOT validate or fetch its contents.

#### Scenario: Record has a Hackatime ID
- **WHEN** the admin queue renders a submission whose record has a non-empty `Justification - Submitter Hackatime ID`
- **THEN** the rendered Telescreen Link is `https://joe-cool.jollyy.dev/billy/overview?u=<url-encoded id>`

### Requirement: Admin queue defaults to unreviewed submissions, filterable by status
The admin queue SHALL default to showing only submissions where `Approved` is unchecked and `Review Status` is `Pending`, with a filter/search control to view Approved, Rejected, or Fraud submissions instead.

#### Scenario: Default queue load
- **WHEN** the admin loads `/admin` with no filter applied
- **THEN** only submissions with `Approved` unchecked and `Review Status = Pending` are shown

#### Scenario: Admin filters by status
- **WHEN** the admin selects a status filter (e.g., Fraud)
- **THEN** the queue shows only submissions matching that filter

### Requirement: Admin can approve a submission
The system SHALL allow the admin to approve a submission, which sets the `Approved` field to checked. This SHALL be a distinct action from Reject/Fraud and SHALL NOT require a message.

#### Scenario: Admin approves
- **WHEN** the admin triggers Approve on a submission
- **THEN** the system sets `Approved = true`, `Reviewed At = now`, `Reviewed By = <admin email>` on that record

### Requirement: Admin can reject a submission with a message
The system SHALL allow the admin to reject a submission, setting `Review Status = Rejected` and requiring a message, which is posted to that submission's message thread.

#### Scenario: Admin rejects with a message
- **WHEN** the admin submits a Reject action with non-empty message text
- **THEN** the system sets `Review Status = Rejected`, `Reviewed At = now`, `Reviewed By = <admin email>` on the record, and creates a new `Submission Messages` row linked to it with `Sender = Admin`

#### Scenario: Admin attempts to reject without a message
- **WHEN** the admin submits a Reject action with empty message text
- **THEN** the system rejects the action client- and server-side and makes no record changes

### Requirement: Admin can flag a submission as fraud
The system SHALL allow the admin to flag a submission as fraud, setting `Review Status = Fraud`. This is a terminal, single-record action with no cascading effect on other records or future submissions from the same person.

#### Scenario: Admin flags fraud
- **WHEN** the admin triggers the Fraud action on a submission
- **THEN** the system sets `Review Status = Fraud`, `Reviewed At = now`, `Reviewed By = <admin email>` on that record only
