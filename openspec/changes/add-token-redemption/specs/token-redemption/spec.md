## ADDED Requirements

### Requirement: Token balance is derived from approved submissions minus redemptions
The system SHALL compute a submitter's token balance for a given email as the sum of `Optional - Override Hours Spent` across that email's `Approved=TRUE` submissions, minus the sum of `Cost` across that email's `Redemptions` records. The balance SHALL be computed live on each request; it SHALL NOT be stored in a cached field.

#### Scenario: Balance reflects approved hours with no redemptions
- **WHEN** a submitter with two Approved submissions of 3 and 5 hours, and no redemption history, requests their balance
- **THEN** the system returns a balance of 8

#### Scenario: Balance reflects prior redemptions
- **WHEN** a submitter has 8 earned hours and one prior redemption costing 3
- **THEN** the system returns a balance of 5

#### Scenario: Balance for an email with no approved submissions
- **WHEN** a submitter with no Approved submissions requests their balance
- **THEN** the system returns a balance of 0

### Requirement: Balance lookup requires an authenticated session
The system SHALL identify the caller from their existing Hack Club OAuth session (the same session mechanism used by `/dashboard`, `/submit`, and `/messages`) and SHALL NOT accept a client-supplied email for balance lookups or redemptions.

#### Scenario: Looking up balance while signed in
- **WHEN** a signed-in user requests their balance
- **THEN** the system returns the current computed token balance for that user's session email

#### Scenario: Looking up balance while signed out
- **WHEN** a visitor with no valid session requests a balance or attempts a redemption
- **THEN** the system rejects the request as unauthenticated rather than falling back to a client-supplied identity

### Requirement: Redemption is rejected when balance is insufficient
The system SHALL reject a redemption request when the requesting email's current computed balance is less than the price of the requested item, and SHALL NOT create a redemption record in that case.

#### Scenario: Redemption attempt exceeds balance
- **WHEN** a submitter with a balance of 2 attempts to redeem an item priced at 3
- **THEN** the system rejects the request, creates no redemption record, and the balance remains 2

### Requirement: Redemption price is authoritative on the server
The system SHALL determine an item's price from the server-side item catalog at redemption time, and SHALL NOT trust a price supplied by the client.

#### Scenario: Client-supplied price is ignored
- **WHEN** a redemption request includes a price value that differs from the catalog's price for that item
- **THEN** the system charges the catalog price, not the client-supplied price

### Requirement: Successful redemption is recorded instantly
When a redemption request passes the balance check, the system SHALL immediately create a redemption record (email, item name, cost, redeemed-at timestamp) and SHALL NOT require any separate approval step before the balance is deducted.

#### Scenario: Successful redemption deducts balance immediately
- **WHEN** a submitter with a balance of 5 redeems an item priced at 3
- **THEN** a redemption record is created for that email, item, and cost, and the submitter's balance immediately reflects 2

### Requirement: Redeemed items are not limited by stock
The system SHALL allow any number of redemptions of the same item, by the same or different submitters, without tracking or enforcing remaining stock.

#### Scenario: Same item redeemed multiple times
- **WHEN** two different submitters, each with sufficient balance, redeem the same item
- **THEN** both redemptions succeed and are recorded independently

### Requirement: Redemption page is separate from the public shop
The system SHALL expose token balance and redemption functionality on a distinct page from the public shop catalog page. The public shop page SHALL remain unauthenticated, balance-free, and unchanged in behavior. The redemption page SHALL require a signed-in Hack Club OAuth session.

#### Scenario: Public shop page shows no balance or redeem action
- **WHEN** any visitor views the public shop page
- **THEN** no balance or redeem action is shown, and the catalog displays exactly as before this change

#### Scenario: Redemption page redirects signed-out visitors to login
- **WHEN** a visitor with no valid session navigates to the redemption page
- **THEN** the system redirects them into the login flow rather than showing balance or catalog content
