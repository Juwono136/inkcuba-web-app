import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AUTH_ROUTES } from "@/lib/auth/constants";
import { getDashboardPath } from "@/lib/auth/redirect";
import { getAuth } from "@/lib/auth/auth";
import { resolveUserRole } from "@/lib/auth/permissions";
import { getSafeInternalPath } from "@/lib/auth/safe-callback";

export async function getSession() {
  return getAuth().api.getSession({
    headers: await headers(),
  });
}

export async function requireAuth(callbackUrl?: string) {
  const session = await getSession();

  if (!session?.user) {
    const safe = getSafeInternalPath(callbackUrl);
    const params = safe
      ? `?callbackUrl=${encodeURIComponent(safe)}`
      : "";
    redirect(`${AUTH_ROUTES.signIn}${params}`);
  }

  return session;
}

export async function redirectIfAuthenticated(callbackUrl?: string | null) {
  const session = await getSession();

  if (session?.user) {
    const safe = getSafeInternalPath(callbackUrl);
    if (safe) {
      redirect(safe);
    }
    redirect(getDashboardPath(resolveUserRole(session.user)));
  }
}
