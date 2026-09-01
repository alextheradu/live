import { NextResponse } from "next/server";
import { HACKCLUB_OAUTH_SCOPE } from "../../../../src/lib/hackclub";
import { getHackclubRedirectUri } from "../../../../src/lib/origin";

export async function GET(request: Request) {
  const params = new URLSearchParams({
    client_id: process.env.OAUTH_CLIENT_ID!,
    redirect_uri: getHackclubRedirectUri(request),
    response_type: "code",
    scope: HACKCLUB_OAUTH_SCOPE,
  });

  return NextResponse.redirect(`https://auth.hackclub.com/oauth/authorize?${params}`);
}
