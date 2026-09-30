import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { UsersPageClient } from "@/components/admin/users/users-page-client";
import { requireRole } from "@/lib/auth/require-role";

export const metadata = {
  title: "User Management",
};

export default async function AdminUsersPage() {
  const session = await requireRole(["ADMIN"]);

  return (
    <div>
      <AdminPageHeader
        title="User Management"
        description="Review every registered account, update roles and activation status, and manage soft-deleted users in trash."
      />
      <UsersPageClient currentUserId={session.user.id} />
    </div>
  );
}
