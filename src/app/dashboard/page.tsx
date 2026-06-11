import { redirect } from "next/navigation";

import { getDashboardPath } from "@/lib/auth/redirect";
import { resolveUserRole } from "@/lib/auth/permissions";
import { requireServerSession } from "@/lib/auth/server";

export default async function DashboardPage() {
  const session = await requireServerSession("/dashboard");
  redirect(getDashboardPath(resolveUserRole(session.user)));
}
