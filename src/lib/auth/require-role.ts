import "server-only";

import { redirect } from "next/navigation";

import { getDashboardPath } from "@/lib/auth/redirect";
import type { UserRole } from "@/lib/auth/permissions";
import { resolveUserRole } from "@/lib/auth/permissions";
import { requireAuth } from "@/lib/auth/session";

export async function requireRole(allowedRoles: UserRole[]) {
  const session = await requireAuth();
  const role = resolveUserRole(session.user);

  if (!allowedRoles.includes(role)) {
    redirect(getDashboardPath(role));
  }

  return session;
}
