import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../src/lib/auth";
import { getTokenBalance } from "../../../../src/lib/airtable";
import { getIdentity } from "../../../../src/lib/hackclub";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session?.access_token) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  const identity = await getIdentity(session.access_token);
  if (!identity?.primary_email) {
    return NextResponse.json({ error: "identity_unavailable" }, { status: 401 });
  }

  const balance = await getTokenBalance(identity.primary_email);
  return NextResponse.json({ balance });
}
