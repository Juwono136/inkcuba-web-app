import "server-only";

import { ForbiddenError } from "@/lib/api/errors";
import { requireApiSession } from "@/lib/settings/require-api-session";

/** Require an authenticated ADMIN session for JSON admin APIs. */
export async function requireAdminApi() {
  const { session, role } = await requireApiSession();

  if (role !== "ADMIN") {
    throw new ForbiddenError("Administrator access required");
  }

  return { session, role };
}
