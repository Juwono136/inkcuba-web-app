import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { resolveUserRole } from "@/lib/auth/permissions";
import { getSettingsPath } from "@/lib/auth/redirect";
import { requireAuth } from "@/lib/auth/session";
import { getSettingsForUser } from "@/lib/settings/get-settings";

export const metadata = {
  title: "My Settings",
};

export default async function SettingsPage() {
  const session = await requireAuth("/dashboard/settings");
  const role = resolveUserRole(session.user);

  if (role === "ADMIN") {
    redirect(getSettingsPath("ADMIN"));
  }

  const settings = await getSettingsForUser(session.user.id);

  return (
    <DashboardShell
      title="My Settings"
      description="Manage your identity, profile photo, public profile, and password."
    >
      <SettingsPageClient initialSettings={settings} />
    </DashboardShell>
  );
}
