import { NextResponse } from "next/server";

import { AppError, isAppError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function apiSuccess<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiSuccess<T>>(
    { success: true, data },
    { status: 200, ...init },
  );
}

export function apiError(error: AppError) {
  return NextResponse.json<ApiFailure>(
    {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    },
    { status: error.statusCode },
  );
}

export function handleApiError(error: unknown, context?: string) {
  if (isAppError(error)) {
    if (error.statusCode >= 500) {
      logger.error({ err: error, context }, "API server error");
    }
    return apiError(error);
  }

  logger.error({ err: error, context }, "Unhandled API error");

  return apiError(
    new AppError(
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : error instanceof Error
          ? error.message
          : "Internal server error",
    ),
  );
}
