import type { UserRole } from "@/lib/auth/permissions";

const ROLE_LABELS: Record<UserRole, string> = {
  STUDENT: "Student",
  LECTURER: "Lecturer",
  ADMIN: "Administrator",
  SUPER_ADMIN: "Super Administrator",
};

export function formatUserRole(role: string | null | undefined): string {
  if (role && role in ROLE_LABELS) {
    return ROLE_LABELS[role as UserRole];
  }

  return "Member";
}
