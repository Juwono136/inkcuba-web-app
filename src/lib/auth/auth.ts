import "server-only";

import { betterAuth, APIError, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { and, eq, isNull } from "drizzle-orm";

import { getServerEnv } from "@/config/env";
import { siteConfig } from "@/config/site";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { user as userTable } from "@/db/schema/auth";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/auth/constants";
import { validateInstitutionalEmail } from "@/lib/auth/permissions";
import { sendResetPasswordEmail } from "@/lib/email/services/reset-password";
import { sendVerificationEmail } from "@/lib/email/services/verification";

let authInstance: ReturnType<typeof betterAuth> | undefined;

function createAuthConfig(): BetterAuthOptions {
  const env = getServerEnv();

  return {
    appName: siteConfig.name,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    trustedOrigins: [siteConfig.appUrl, siteConfig.url],
    session: {
      expiresIn: SESSION_MAX_AGE_SECONDS,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
      },
    },
    advanced: {
      cookiePrefix: "inkcuba",
      useSecureCookies: env.NODE_ENV === "production",
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: false,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await sendResetPasswordEmail({
          email: user.email,
          name: user.name,
          resetUrl: url,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendVerificationEmail({
          email: user.email,
          name: user.name,
          verificationUrl: url,
        });
      },
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          defaultValue: "STUDENT",
          input: false,
        },
        nim: {
          type: "string",
          required: false,
          input: true,
        },
        nidn: {
          type: "string",
          required: false,
          input: true,
        },
        campus: {
          type: "string",
          required: false,
          input: true,
        },
        isActive: {
          type: "boolean",
          required: false,
          defaultValue: true,
          input: false,
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            validateInstitutionalEmail(user.email);

            // Self-service registration is always STUDENT.
            // LECTURER / ADMIN are assigned later via Admin User Management (or seed).
            return {
              data: {
                ...user,
                role: "STUDENT",
              },
            };
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const rows = await db
              .select({
                isActive: userTable.isActive,
                deletedAt: userTable.deletedAt,
              })
              .from(userTable)
              .where(
                and(eq(userTable.id, session.userId), isNull(userTable.deletedAt)),
              )
              .limit(1);

            const account = rows[0];

            if (!account) {
              throw new APIError("FORBIDDEN", {
                message:
                  "This account is no longer available. Please contact an administrator.",
              });
            }

            if (!account.isActive) {
              throw new APIError("FORBIDDEN", {
                message:
                  "Your account has been deactivated. Please contact an administrator to reactivate it.",
              });
            }

            return { data: session };
          },
          after: async (session) => {
            const { recordLoginHistory } = await import(
              "@/lib/auth/login-history"
            );
            await recordLoginHistory({
              userId: String(session.userId),
              sessionId: String(session.id),
              ipAddress:
                typeof session.ipAddress === "string" ? session.ipAddress : null,
              userAgent:
                typeof session.userAgent === "string" ? session.userAgent : null,
              createdAt:
                session.createdAt instanceof Date
                  ? session.createdAt
                  : undefined,
            });
          },
        },
      },
    },
  };
}

export function getAuth() {
  if (!authInstance) {
    authInstance = betterAuth(createAuthConfig());
  }

  return authInstance;
}

export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
  get(_target, property, receiver) {
    const instance = getAuth();
    const value = Reflect.get(instance, property, receiver);

    if (typeof value === "function") {
      return value.bind(instance);
    }

    return value;
  },
});

export type Session = ReturnType<typeof getAuth>["$Infer"]["Session"];
export type AuthUser = Session["user"];
