import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireAuth } from "@/lib/auth/session";

export const metadata = {
  title: "My Settings",
};

export default async function SettingsPage() {
  const session = await requireAuth("/dashboard/settings");

  return (
    <DashboardShell
      title="My Settings"
      description="Manage your account preferences and profile information."
    >
      <div className="rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-inkcuba">
        <p className="text-sm text-slate-600">
          Account settings for{" "}
          <span className="font-semibold text-slate-900">{session.user.name}</span>{" "}
          will be available here soon.
        </p>
      </div>
    </DashboardShell>
  );
}
