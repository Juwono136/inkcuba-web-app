import type { UserRole } from "@/lib/auth/permissions";
import { AUTH_ROUTES } from "@/lib/auth/constants";

export function getDashboardPath(role?: string | null): string {
  switch (role as UserRole) {
    case "LECTURER":
      return `${AUTH_ROUTES.dashboard}/lecturer`;
    case "ADMIN":
    case "SUPER_ADMIN":
      return `${AUTH_ROUTES.dashboard}/admin`;
    case "STUDENT":
    default:
      return `${AUTH_ROUTES.dashboard}/student`;
  }
}

export function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith("/auth/");
}

export function isDashboardRoute(pathname: string): boolean {
  return pathname.startsWith("/dashboard");
}

export function isPublicOnlyAuthRoute(pathname: string): boolean {
  return (
    pathname === AUTH_ROUTES.signIn || pathname === AUTH_ROUTES.signUp
  );
}
