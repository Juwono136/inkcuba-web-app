import { redirect } from "next/navigation";

import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { resolveUserRole } from "@/lib/auth/permissions";
import { getDashboardPath, getSettingsPath } from "@/lib/auth/redirect";
import { requireAuth } from "@/lib/auth/session";
import type { WorkspaceRole } from "@/lib/workspace/nav";

export default async function WorkspaceDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  const role = resolveUserRole(session.user);

  if (role === "ADMIN") {
    redirect(getSettingsPath("ADMIN"));
  }

  if (role !== "STUDENT" && role !== "LECTURER") {
    redirect(getDashboardPath(role));
  }

  return (
    <WorkspaceShell role={role as WorkspaceRole}>{children}</WorkspaceShell>
  );
}
