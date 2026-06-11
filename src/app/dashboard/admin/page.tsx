import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireRole } from "@/lib/auth/require-role";

export const metadata = {
  title: "Admin Dashboard",
};

export default async function AdminDashboardPage() {
  const session = await requireRole(["ADMIN", "SUPER_ADMIN"]);

  return (
    <DashboardShell
      title="Admin Dashboard"
      description="Oversee platform operations, user management, and institutional exhibition settings."
    >
      <div className="rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-inkcuba">
        <p className="text-sm text-slate-600">
          Welcome, <span className="font-semibold text-slate-900">{session.user.name}</span>.
          Administrative tools will be available here soon.
        </p>
      </div>
    </DashboardShell>
  );
}
