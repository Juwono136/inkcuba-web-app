import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/auth/require-role";

export const metadata = {
  title: "Student Dashboard",
};

export default async function StudentDashboardPage() {
  const session = await requireRole(["STUDENT"]);

  return (
    <DashboardShell
      title="Student Dashboard"
      description="Manage your portfolios, track submission status, and explore verified exhibition showcases."
    >
      <div className="rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-inkcuba">
        <p className="text-sm text-slate-600">
          Welcome, <span className="font-semibold text-slate-900">{session.user.name}</span>.
          Your portfolio workspace will be available here soon.
        </p>
      </div>
    </DashboardShell>
  );
}
