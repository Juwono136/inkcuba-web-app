import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { WorkspacesTrashClient } from "@/components/lecturer/workspaces/workspaces-trash-client";
import { requireRole } from "@/lib/auth/require-role";

export const metadata = {
  title: "Workspace trash",
};

export default async function LecturerWorkspacesTrashPage() {
  await requireRole(["LECTURER"]);

  return (
    <DashboardShell
      title="Workspace trash"
      description="Restore or permanently delete soft-deleted workspaces."
      hideHeader
    >
      <WorkspacesTrashClient />
    </DashboardShell>
  );
}
