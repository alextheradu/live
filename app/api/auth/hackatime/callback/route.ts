import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../../src/lib/auth";
import { exchangeHackatimeCodeForToken } from "../../../../../src/lib/hackatime";
import { getHackatimeRedirectUri, getRequestOrigin } from "../../../../../src/lib/origin";
import { encryptSession, sessionCookieOptions } from "../../../../../src/lib/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const origin = getRequestOrigin(request);

  if (error || !code) {
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(error || "missing_code")}`);
  }

  // This hop only makes sense after the HCA identity hop already ran and set
  // a session cookie — if it's missing, restart from the top.
  const existingSession = await getSessionFromRequest(request);
  if (!existingSession) {
    return NextResponse.redirect(`${origin}/api/auth/login`);
  }

  const tokens = await exchangeHackatimeCodeForToken({
    code,
    redirectUri: getHackatimeRedirectUri(request),
  });

  if (!tokens?.access_token) {
    return NextResponse.redirect(`${origin}/?error=hackatime_token_exchange_failed`);
  }

  const session = await encryptSession({
    ...existingSession,
    hackatime_access_token: tokens.access_token,
  });

  const response = NextResponse.redirect(`${origin}/dashboard`);
  response.cookies.set(sessionCookieOptions.name, session, sessionCookieOptions);
  return response;
}
