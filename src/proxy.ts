import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  AUTH_COOKIE_PREFIX,
  AUTH_ROUTES,
} from "@/lib/auth/constants";
import {
  getDashboardPath,
  isDashboardRoute,
  isGuestOnlyAuthRoute,
} from "@/lib/auth/redirect";

function hasSessionCookie(request: NextRequest): boolean {
  return Boolean(request.cookies.get(`${AUTH_COOKIE_PREFIX}.session_token`)?.value);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = hasSessionCookie(request);

  if (isGuestOnlyAuthRoute(pathname) && isAuthenticated) {
    return NextResponse.redirect(
      new URL(getDashboardPath(), request.url),
    );
  }

  if (isDashboardRoute(pathname) && !isAuthenticated) {
    const signInUrl = new URL(AUTH_ROUTES.signIn, request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  const response = NextResponse.next();

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  if (pathname.startsWith("/api/")) {
    response.headers.set("X-API-Route", "true");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
