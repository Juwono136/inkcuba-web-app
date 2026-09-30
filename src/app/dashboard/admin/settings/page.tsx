import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { requireRole } from "@/lib/auth/require-role";
import { getSettingsForUser } from "@/lib/settings/get-settings";

export const metadata = {
  title: "My Settings · Admin",
};

export default async function AdminSettingsPage() {
  const session = await requireRole(["ADMIN"]);
  const settings = await getSettingsForUser(session.user.id);

  return (
    <div>
      <AdminPageHeader
        title="My Settings"
        description="Manage your administrator identity, profile photo, and password within the admin console."
      />
      <SettingsPageClient initialSettings={settings} variant="admin" />
    </div>
  );
}
