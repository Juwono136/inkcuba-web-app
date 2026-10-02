import "server-only";

import { ForbiddenError } from "@/lib/api/errors";
import { requireApiSession } from "@/lib/settings/require-api-session";

/** Require an authenticated LECTURER session for lecturer workspace APIs. */
export async function requireLecturerApi() {
  const { session, role } = await requireApiSession();

  if (role !== "LECTURER") {
    throw new ForbiddenError("Lecturer access required");
  }

  return { session, role };
}
