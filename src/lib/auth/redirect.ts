import type { UserRole } from "@/lib/auth/permissions";
import { AUTH_ROUTES } from "@/lib/auth/constants";

export function getDashboardPath(role?: string | null): string {
  switch (role as UserRole) {
    case "LECTURER":
      return `${AUTH_ROUTES.dashboard}/lecturer`;
    case "ADMIN":
      return `${AUTH_ROUTES.dashboard}/admin`;
    case "STUDENT":
    default:
      return `${AUTH_ROUTES.dashboard}/student`;
  }
}

export function getSettingsPath(role?: string | null): string {
  if ((role as UserRole) === "ADMIN") {
    return `${AUTH_ROUTES.dashboard}/admin/settings`;
  }

  return `${AUTH_ROUTES.dashboard}/settings`;
}

export function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith("/auth/");
}

export function isDashboardRoute(pathname: string): boolean {
  return pathname.startsWith("/dashboard");
}

/** Auth pages that logged-in users must not access */
export function isGuestOnlyAuthRoute(pathname: string): boolean {
  // Activation must stay available even if a stale session cookie exists;
  // still treat other /auth pages as guest-only.
  if (pathname.startsWith("/auth/activate")) return false;
  return isAuthRoute(pathname);
}

/** @deprecated Use isGuestOnlyAuthRoute */
export function isPublicOnlyAuthRoute(pathname: string): boolean {
  return isGuestOnlyAuthRoute(pathname);
}
