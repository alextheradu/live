const HACKCLUB_AUTH_BASE = "https://auth.hackclub.com";

// birthdate and address are HQ-Official-tier-only scopes on auth.hackclub.com
// (hackclub/auth app/models/oauth_scope.rb) — a Community-tier app gets
// "invalid scope" if it requests them. Those two fields are collected
// manually in the submission form instead of being autofilled from OAuth.
export const HACKCLUB_OAUTH_SCOPE = "name email verification_status";

export type HackclubTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

export type HackclubIdentity = {
  id: string;
  first_name?: string;
  last_name?: string;
  primary_email?: string;
};

export async function exchangeCodeForTokens({
  code,
  redirectUri,
}: {
  code: string;
  redirectUri: string;
}): Promise<HackclubTokens | null> {
  const response = await fetch(`${HACKCLUB_AUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: process.env.OAUTH_CLIENT_ID!,
      client_secret: process.env.OAUTH_CLIENT_SECRET!,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) return null;
  return response.json();
}

// Returns { id, first_name, last_name, primary_email, ... } or null.
// See auth.hackclub.com/api-docs for the full shape.
export async function getIdentity(accessToken: string): Promise<HackclubIdentity | null> {


  // while we are at the airplane




  const response = await fetch(`${HACKCLUB_AUTH_BASE}/api/v1/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    console.error("[hackclub] /api/v1/me failed", response.status, await response.text());
    return null;
  }
  const data = await response.json();
  return data.identity ?? null;
}
