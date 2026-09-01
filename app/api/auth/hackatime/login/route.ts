import { NextResponse } from "next/server";
import { HACKATIME_OAUTH_SCOPE } from "../../../../../src/lib/hackatime";
import { getHackatimeRedirectUri } from "../../../../../src/lib/origin";

export async function GET(request: Request) {
  const params = new URLSearchParams({
    client_id: process.env.HACKATIME_CLIENT_UID!,
    redirect_uri: getHackatimeRedirectUri(request),
    response_type: "code",
    scope: HACKATIME_OAUTH_SCOPE,
  });

  return NextResponse.redirect(`https://hackatime.hackclub.com/oauth/authorize?${params}`);
}
