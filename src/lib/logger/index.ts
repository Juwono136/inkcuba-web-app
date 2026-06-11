import "server-only";

import pino from "pino";

const isDevelopment = process.env.NODE_ENV === "development";
const logLevel = process.env.LOG_LEVEL ?? "info";

export const logger = pino({
  level: logLevel,
  ...(isDevelopment
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      }
    : {}),
  base: {
    service: "inkcuba",
    env: process.env.NODE_ENV,
  },
  redact: {
    paths: [
      "password",
      "token",
      "secret",
      "authorization",
      "cookie",
      "SMTP_PASS",
      "FIREBASE_PRIVATE_KEY",
      "PASSWORD_STORAGE",
      "HEALTH_CHECK_TOKEN",
    ],
    censor: "[REDACTED]",
  },
});

export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
