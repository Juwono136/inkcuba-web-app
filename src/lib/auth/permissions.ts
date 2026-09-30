import { siteConfig } from "@/config/site";

export type UserRole = "STUDENT" | "LECTURER" | "ADMIN";

export function getEmailDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

export function isAllowedInstitutionalEmail(email: string): boolean {
  const domain = getEmailDomain(email);
  return (
    domain === siteConfig.allowedStudentEmailDomain ||
    domain === siteConfig.allowedLecturerEmailDomain
  );
}

/**
 * Soft hint from email domain (docs / admin tooling only).
 * Self-service registration always creates STUDENT — lecturers/admins are assigned later.
 */
export function inferRoleFromEmail(email: string): UserRole {
  const domain = getEmailDomain(email);

  if (domain === siteConfig.allowedLecturerEmailDomain) {
    return "LECTURER";
  }

  if (domain === siteConfig.allowedStudentEmailDomain) {
    return "STUDENT";
  }

  throw new Error(
    `Email domain not allowed. Use @${siteConfig.allowedStudentEmailDomain} or @${siteConfig.allowedLecturerEmailDomain}.`,
  );
}

export function validateInstitutionalEmail(email: string): void {
  if (!isAllowedInstitutionalEmail(email)) {
    throw new Error(
      `Only institutional emails (@${siteConfig.allowedStudentEmailDomain} or @${siteConfig.allowedLecturerEmailDomain}) are allowed.`,
    );
  }
}

const USER_ROLES: UserRole[] = ["STUDENT", "LECTURER", "ADMIN"];

/**
 * Resolve the authoritative role from the stored user record.
 * Never re-infer lecturer from email alone — that caused @binus.ac.id
 * self-signups to open lecturer settings and crash.
 */
export function resolveUserRole(user: {
  email: string;
  role?: string | null;
}): UserRole {
  // Legacy value from older schema — treat as ADMIN
  if (user.role === "SUPER_ADMIN") {
    return "ADMIN";
  }

  if (user.role && USER_ROLES.includes(user.role as UserRole)) {
    return user.role as UserRole;
  }

  return "STUDENT";
}
