import "server-only";

import pino, { type Logger } from "pino";

const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";
const logLevel = process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug");

type LoggerGlobal = typeof globalThis & {
  __inkcubaLogger?: Logger;
  __inkcubaStdoutListenersRaised?: boolean;
};

const globalStore = globalThis as LoggerGlobal;

/**
 * Raise stdout listener budget once. Next.js / Turbopack HMR can remount
 * modules; without a singleton, pino-pretty would keep attaching pipes.
 * The singleton below is the real fix — this is a safe ceiling for hot reload.
 */
function ensureStdoutListenerBudget() {
  if (globalStore.__inkcubaStdoutListenersRaised) return;
  if (typeof process === "undefined" || !process.stdout) return;

  const current = process.stdout.getMaxListeners();
  if (current > 0 && current < 32) {
    process.stdout.setMaxListeners(32);
  }

  globalStore.__inkcubaStdoutListenersRaised = true;
}

function createLogger(): Logger {
  ensureStdoutListenerBudget();

  return pino({
    level: logLevel,
    // Pretty transport only in local development. Production emits JSON lines
    // suitable for log aggregators (CloudWatch, Datadog, Railway, etc.).
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
        "PASSWORD_STORAGE",
        "HEALTH_CHECK_TOKEN",
        "*.password",
        "*.token",
        "*.secret",
      ],
      censor: "[REDACTED]",
    },
  });
}

/**
 * Process-wide singleton. Critical under Next.js HMR so we do not spawn
 * multiple pino-pretty workers that stack `unpipe`/`error`/`close` listeners
 * on `process.stdout` (MaxListenersExceededWarning).
 */
export const logger: Logger =
  globalStore.__inkcubaLogger ?? (globalStore.__inkcubaLogger = createLogger());

export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
