export {
  auth,
  getAuth,
  type Session,
  type AuthUser,
} from "@/lib/auth/auth";
export {
  BINUS_CAMPUSES,
  AUTH_ROUTES,
  SESSION_MAX_AGE_SECONDS,
  generateDefaultAvatarUrl,
} from "@/lib/auth/constants";
export { getDashboardPath, isDashboardRoute } from "@/lib/auth/redirect";
export {
  getServerSession,
  requireServerSession,
  redirectIfAuthenticated,
} from "@/lib/auth/server";
export { requireRole } from "@/lib/auth/require-role";
export { authClient, signIn, signUp, signOut, useSession } from "@/lib/auth/client";
export {
  validateInstitutionalEmail,
  inferRoleFromEmail,
  isAllowedInstitutionalEmail,
  getEmailDomain,
  resolveUserRole,
  type UserRole,
} from "@/lib/auth/permissions";
export { signInSchema, signUpSchema } from "@/lib/validators/auth";
export {
  saveRememberedCredentials,
  loadRememberedCredentials,
  clearRememberedCredentials,
} from "@/lib/auth/remember-credentials";
