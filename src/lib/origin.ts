const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

// Derives the public origin from request headers rather than the server's
// own bind address, which is wrong behind a proxy (Vercel) or in dev
// containers. This is what makes OAuth redirect URIs work automatically on
// both localhost and every deployed domain without hardcoding anything.
export function getRequestOrigin(request: Request): string {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host") || "";
  const protocol = forwardedProto || (LOCAL_HOST.test(host) ? "http" : "https");
  return `${protocol}://${host}`;
}

export function getHackclubRedirectUri(request: Request): string {
  return `${getRequestOrigin(request)}/api/auth/callback`;
}

export function getHackatimeRedirectUri(request: Request): string {
  return `${getRequestOrigin(request)}/api/auth/hackatime/callback`;
}
