import "server-only";

export {
  getSession as getServerSession,
  requireAuth as requireServerSession,
  redirectIfAuthenticated,
} from "@/lib/auth/session";
