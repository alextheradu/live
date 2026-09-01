import { NextResponse } from "next/server";
import { exchangeCodeForTokens } from "../../../../src/lib/hackclub";
import { getHackclubRedirectUri, getRequestOrigin } from "../../../../src/lib/origin";
import { encryptSession, sessionCookieOptions } from "../../../../src/lib/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const origin = getRequestOrigin(request);

  if (error || !code) {
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(error || "missing_code")}`);
  }

  const tokens = await exchangeCodeForTokens({ code, redirectUri: getHackclubRedirectUri(request) });

  if (!tokens?.access_token) {
    return NextResponse.redirect(`${origin}/?error=token_exchange_failed`);
  }

  const session = await encryptSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
  });

  // HCA identity and Hackatime are separate OAuth providers with separate
  // tokens — chain straight into the second authorization hop rather than
  // landing on /dashboard without it.
  const response = NextResponse.redirect(`${origin}/api/auth/hackatime/login`);
  response.cookies.set(sessionCookieOptions.name, session, sessionCookieOptions);
  return response;
}
