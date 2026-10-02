import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { StudentWorkspacesListClient } from "@/components/student/workspaces/student-workspaces-list-client";
import { requireRole } from "@/lib/auth/require-role";

export const metadata = {
  title: "My Workspaces",
};

export default async function StudentWorkspacesPage() {
  await requireRole(["STUDENT"]);

  return (
    <DashboardShell
      title="My Workspaces"
      description="Join and open class workspaces shared by your lecturers."
      hideHeader
    >
      <StudentWorkspacesListClient />
    </DashboardShell>
  );
}
