## ADDED Requirements

### Requirement: HCA login initiates OAuth authorization
The system SHALL redirect an unauthenticated user who starts login to `auth.hackclub.com`'s OAuth authorize endpoint, requesting only the `name email verification_status` scope.

#### Scenario: User starts login
- **WHEN** an unauthenticated user visits the login route
- **THEN** the system redirects them to `auth.hackclub.com/oauth/authorize` with `client_id`, `redirect_uri`, and scope `name email verification_status`

### Requirement: OAuth callback exchanges code for tokens and issues a session
The system SHALL exchange the authorization code for an access/refresh token pair server-side (using `OAUTH_CLIENT_ID`/`OAUTH_CLIENT_SECRET`, never exposed to the browser), fetch the user's identity, and issue an encrypted session cookie.

#### Scenario: Successful callback
- **WHEN** `auth.hackclub.com` redirects back with a valid `code`
- **THEN** the system exchanges it server-side for tokens, calls `/api/v1/me` to retrieve identity, and sets an httpOnly, secure, `SameSite=Lax` session cookie containing the encrypted token payload

#### Scenario: Failed or denied callback
- **WHEN** the callback arrives without a valid `code`, or the token exchange fails
- **THEN** the system does not set a session cookie and redirects to an error state without creating any partial session

### Requirement: Session is stateless and encrypted, with no server-side session store
The system SHALL store session data only as an encrypted JWT in the cookie (via `jose`, `EncryptJWT`/`jwtDecrypt`, `dir`/`A256GCM`, key derived from `SESSION_SECRET`), with no database or in-memory session table of any kind.

#### Scenario: Session read on a protected route
- **WHEN** a request to a protected route includes a valid session cookie
- **THEN** the system decrypts it in-process and uses the payload directly, without any lookup against a session store

#### Scenario: Tampered or expired session cookie
- **WHEN** a request includes a session cookie that fails decryption or has expired
- **THEN** the system treats the request as unauthenticated

### Requirement: Logout clears the session
The system SHALL clear the session cookie on logout, with no server-side state to invalidate beyond the cookie itself.

#### Scenario: User logs out
- **WHEN** an authenticated user requests logout
- **THEN** the system clears the session cookie and subsequent requests are treated as unauthenticated

### Requirement: Admin routes are gated by a hardcoded email allowlist
The system SHALL restrict `/admin` and all `app/api/admin/**` routes to sessions whose identity's primary email is in a hardcoded allowlist (initially `sebastianhernandez@hackclub.com`).

#### Scenario: Allowlisted user accesses admin
- **WHEN** a request to `/admin` or an admin API route carries a valid session whose identity email is in the allowlist
- **THEN** the system serves the request

#### Scenario: Non-admin authenticated user accesses admin
- **WHEN** a request to `/admin` or an admin API route carries a valid session whose identity email is not in the allowlist
- **THEN** the system rejects the request (redirect or 403) without exposing any admin data

#### Scenario: Unauthenticated user accesses admin
- **WHEN** a request to `/admin` or an admin API route carries no valid session
- **THEN** the system redirects to login without exposing any admin data
