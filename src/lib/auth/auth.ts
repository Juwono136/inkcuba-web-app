import "server-only";

import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { getServerEnv } from "@/config/env";
import { siteConfig } from "@/config/site";
import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  inferRoleFromEmail,
  validateInstitutionalEmail,
} from "@/lib/auth/permissions";
import {
  resetPasswordEmailTemplate,
  sendEmail,
  verificationEmailTemplate,
} from "@/lib/email";

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
      expiresIn: 60 * 60 * 24 * 7,
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
      sendResetPassword: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Reset Password — inkcuba",
          html: resetPasswordEmailTemplate(url, user.name),
          text: `Reset password inkcuba: ${url}`,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Verifikasi Email — inkcuba",
          html: verificationEmailTemplate(url, user.name),
          text: `Verifikasi email inkcuba: ${url}`,
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
            const role = inferRoleFromEmail(user.email);

            return {
              data: {
                ...user,
                role,
              },
            };
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
