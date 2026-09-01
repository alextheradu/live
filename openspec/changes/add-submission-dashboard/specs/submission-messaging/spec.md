## ADDED Requirements

### Requirement: Messages are stored as rows in a linked Airtable table, not a single field
The system SHALL store each message as its own row in the `Submission Messages` table, linked to the relevant `YSWS Project Submission` record, with `Sender` (Admin or Submitter), `Message` text, and `Sent At` timestamp.

#### Scenario: A message is sent
- **WHEN** either the admin or the submitter sends a message on a submission
- **THEN** the system creates a new `Submission Messages` row linked to that submission's record, with the correct `Sender` and current timestamp

### Requirement: Message thread supports multiple rounds in either direction
The system SHALL NOT limit the number of messages or require strict alternation between admin and submitter — either party can send multiple consecutive messages, across multiple resubmission cycles.

#### Scenario: Multiple rounds of back-and-forth
- **WHEN** a submission has been rejected, messaged, resubmitted, and rejected again
- **THEN** all messages from every round remain visible in the same thread, in chronological order, linked to the same submission record

### Requirement: Admin and submitter see the same thread
The system SHALL render the identical message thread (same rows, same order) on both the admin queue's detail view and the submitter's own dashboard for that submission.

#### Scenario: Admin posts a message
- **WHEN** the admin sends a message on a submission
- **THEN** the submitter's dashboard, on next load, shows that message in the thread

#### Scenario: Submitter posts a reply
- **WHEN** the submitter sends a reply on their own submission
- **THEN** the admin queue's detail view for that submission, on next load, shows that reply in the thread

### Requirement: Only the matching submitter can post as themselves
The system SHALL only accept a submitter-authored message from a session whose identity email matches the target submission record's `Email` field.

#### Scenario: Authenticated user tries to message on someone else's submission
- **WHEN** an authenticated user attempts to post a message linked to a submission record whose `Email` does not match their session identity
- **THEN** the system rejects the request

### Requirement: Only the allowlisted admin can post as Admin
The system SHALL only accept an Admin-sender message from a session passing the admin allowlist check.

#### Scenario: Non-admin attempts to post as Admin
- **WHEN** a non-admin authenticated user attempts to create a message with `Sender = Admin`
- **THEN** the system rejects the request
