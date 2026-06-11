"use client";

import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { clientEnv } from "@/config/env-client";

export const authClient = createAuthClient({
  baseURL: clientEnv.NEXT_PUBLIC_APP_URL,
  plugins: [
    inferAdditionalFields({
      user: {
        role: { type: "string", required: false },
        nim: { type: "string", required: false, input: true },
        nidn: { type: "string", required: false, input: true },
        campus: { type: "string", required: false, input: true },
      },
    }),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
