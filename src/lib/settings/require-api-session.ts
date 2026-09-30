import "server-only";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { UnauthorizedError } from "@/lib/api/errors";
import { getAuth } from "@/lib/auth/auth";
import { resolveUserRole } from "@/lib/auth/permissions";

export async function requireApiSession() {
  const session = await getAuth().api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new UnauthorizedError();
  }

  return {
    session,
    role: resolveUserRole(session.user),
  };
}
