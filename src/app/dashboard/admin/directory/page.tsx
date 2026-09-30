import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DirectoryOptionsPageClient } from "@/components/admin/directory/directory-options-page-client";
import { requireRole } from "@/lib/auth/require-role";

export const metadata = {
  title: "Directory Options",
};

export default async function AdminDirectoryOptionsPage() {
  await requireRole(["ADMIN"]);

  return (
    <div>
      <AdminPageHeader
        title="Directory Options"
        description="Manage campus, major, batch, semester, and department values used across profiles and registration."
      />
      <DirectoryOptionsPageClient />
    </div>
  );
}
