import { siteConfig } from "@/config/site";

export type UserRole = "STUDENT" | "LECTURER" | "ADMIN" | "SUPER_ADMIN";

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

const USER_ROLES: UserRole[] = ["STUDENT", "LECTURER", "ADMIN", "SUPER_ADMIN"];

export function resolveUserRole(user: {
  email: string;
  role?: string | null;
}): UserRole {
  if (user.role && USER_ROLES.includes(user.role as UserRole)) {
    return user.role as UserRole;
  }

  return inferRoleFromEmail(user.email);
}
