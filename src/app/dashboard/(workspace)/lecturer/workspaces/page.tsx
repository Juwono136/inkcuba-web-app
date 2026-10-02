import { WorkspacesListClient } from "@/components/lecturer/workspaces/workspaces-list-client";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/auth/require-role";

export const metadata = {
  title: "Workspaces",
};

export default async function LecturerWorkspacesPage() {
  await requireRole(["LECTURER"]);

  return (
    <DashboardShell
      title="Workspaces"
      description="Manage class workspaces for portfolio submissions and reviews."
      hideHeader
    >
      <WorkspacesListClient />
    </DashboardShell>
  );
}
