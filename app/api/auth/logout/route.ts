import { NextResponse } from "next/server";
import { getRequestOrigin } from "../../../../src/lib/origin";
import { sessionCookieOptions } from "../../../../src/lib/session";

export async function GET(request: Request) {
  const response = NextResponse.redirect(`${getRequestOrigin(request)}/`);
  response.cookies.delete(sessionCookieOptions.name);
  return response;
}
