import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/auth/require-role";

export const metadata = {
  title: "Lecturer Dashboard",
};

export default async function LecturerDashboardPage() {
  const session = await requireRole(["LECTURER"]);

  return (
    <DashboardShell
      title="Lecturer Dashboard"
      description="Review student submissions, manage courses, and publish verified portfolios to the exhibition."
    >
      <div className="rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-inkcuba">
        <p className="text-sm text-slate-600">
          Welcome, <span className="font-semibold text-slate-900">{session.user.name}</span>.
          Your review workspace will be available here soon.
        </p>
      </div>
    </DashboardShell>
  );
}
