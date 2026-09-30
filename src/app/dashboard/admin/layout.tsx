import { AdminShell } from "@/components/admin/admin-shell";
import { resolveUserRole } from "@/lib/auth/permissions";
import { requireRole } from "@/lib/auth/require-role";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(["ADMIN"]);

  return (
    <AdminShell
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: resolveUserRole(session.user),
      }}
    >
      {children}
    </AdminShell>
  );
}
