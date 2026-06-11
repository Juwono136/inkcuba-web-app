import "server-only";

import { z } from "zod";

const logLevels = ["debug", "info", "warn", "error"] as const;
const storageAuthModes = ["nginx-basic", "s3"] as const;

const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.url(),
  AUTH_LOCKOUT_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  FIREBASE_PRIVATE_KEY: z.string().min(1),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().email(),
  SMTP_PASS: z.string().min(1),
  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.coerce.number().int().positive(),
  REDIS_PASSWORD: z.string().optional(),
  STORAGE_AUTH_MODE: z.enum(storageAuthModes),
  STORAGE_ENDPOINT: z.url(),
  STORAGE_BUCKET: z.string().min(1),
  STORAGE_REGION: z.string().min(1),
  USERNAME_STORAGE: z.string().min(1),
  PASSWORD_STORAGE: z.string().min(1),
  LOG_LEVEL: z.enum(logLevels).default("info"),
  HEALTH_CHECK_TOKEN: z
    .string()
    .min(16, "HEALTH_CHECK_TOKEN must be at least 16 characters"),
});

function parseEnv<T extends z.ZodType>(
  schema: T,
  source: Record<string, string | undefined>,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${formatted}`);
  }
  return result.data;
}

let cachedServerEnv: z.infer<typeof serverEnvSchema> | undefined;

export function getServerEnv() {
  if (!cachedServerEnv) {
    cachedServerEnv = parseEnv(serverEnvSchema, {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL,
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
      AUTH_LOCKOUT_ENABLED: process.env.AUTH_LOCKOUT_ENABLED,
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
      REDIS_HOST: process.env.REDIS_HOST,
      REDIS_PORT: process.env.REDIS_PORT,
      REDIS_PASSWORD: process.env.REDIS_PASSWORD,
      STORAGE_AUTH_MODE: process.env.STORAGE_AUTH_MODE,
      STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT,
      STORAGE_BUCKET: process.env.STORAGE_BUCKET,
      STORAGE_REGION: process.env.STORAGE_REGION,
      USERNAME_STORAGE: process.env.USERNAME_STORAGE,
      PASSWORD_STORAGE: process.env.PASSWORD_STORAGE,
      LOG_LEVEL: process.env.LOG_LEVEL,
      HEALTH_CHECK_TOKEN: process.env.HEALTH_CHECK_TOKEN,
    });
  }

  return cachedServerEnv;
}

export type ServerEnv = ReturnType<typeof getServerEnv>;
