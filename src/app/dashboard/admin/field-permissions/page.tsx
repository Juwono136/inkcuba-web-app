import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { FieldPermissionsPageClient } from "@/components/admin/field-permissions/field-permissions-page-client";
import { requireRole } from "@/lib/auth/require-role";

export const metadata = {
  title: "Field Permissions",
};

export default async function AdminFieldPermissionsPage() {
  await requireRole(["ADMIN"]);

  return (
    <div>
      <AdminPageHeader
        title="Field Permissions"
        description="Control which identity fields each role can edit on My Settings. Institutional overrides in User Management always remain available to admins."
      />
      <FieldPermissionsPageClient />
    </div>
  );
}
