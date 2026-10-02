import { WorkspaceCreateClient } from "@/components/lecturer/workspaces/workspace-create-client";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/auth/require-role";

export const metadata = {
  title: "Create workspace",
};

export default async function LecturerWorkspaceCreatePage() {
  await requireRole(["LECTURER"]);

  return (
    <DashboardShell
      title="Create workspace"
      description="Set up a new class workspace."
      hideHeader
    >
      <WorkspaceCreateClient />
    </DashboardShell>
  );
}
