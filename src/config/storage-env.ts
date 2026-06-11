import "server-only";

import { z } from "zod";

const storageAuthModes = ["nginx-basic", "s3"] as const;

const storageEnvSchema = z.object({
  STORAGE_AUTH_MODE: z.enum(storageAuthModes),
  STORAGE_ENDPOINT: z.url(),
  STORAGE_BUCKET: z.string().min(1),
  STORAGE_REGION: z.string().min(1),
  USERNAME_STORAGE: z.string().min(1),
  PASSWORD_STORAGE: z.string().min(1),
});

let cachedStorageEnv: z.infer<typeof storageEnvSchema> | undefined;

export function getStorageEnv() {
  if (!cachedStorageEnv) {
    const result = storageEnvSchema.safeParse({
      STORAGE_AUTH_MODE: process.env.STORAGE_AUTH_MODE,
      STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT,
      STORAGE_BUCKET: process.env.STORAGE_BUCKET,
      STORAGE_REGION: process.env.STORAGE_REGION,
      USERNAME_STORAGE: process.env.USERNAME_STORAGE,
      PASSWORD_STORAGE: process.env.PASSWORD_STORAGE,
    });

    if (!result.success) {
      const formatted = result.error.issues
        .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
        .join("\n");
      throw new Error(`Invalid storage environment variables:\n${formatted}`);
    }

    cachedStorageEnv = result.data;
  }

  return cachedStorageEnv;
}
