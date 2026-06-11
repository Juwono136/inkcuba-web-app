export {
  auth,
  getAuth,
  type Session,
  type AuthUser,
} from "@/lib/auth/auth";
export { getServerSession, requireServerSession } from "@/lib/auth/server";
export { authClient, signIn, signUp, signOut, useSession } from "@/lib/auth/client";
export {
  validateInstitutionalEmail,
  inferRoleFromEmail,
  isAllowedInstitutionalEmail,
  type UserRole,
} from "@/lib/auth/permissions";
