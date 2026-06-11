import { toNextJsHandler } from "better-auth/next-js";

import { applyCorsHeaders, corsPreflightResponse } from "@/lib/api/cors";
import { getAuth } from "@/lib/auth/auth";
import { enforceAuthRateLimit } from "@/lib/auth/rate-limit";
import { validatePasswordStrength } from "@/lib/validators/password";

function getHandler() {
  return toNextJsHandler(getAuth());
}

async function validateSignUpPassword(
  request: Request,
): Promise<Response | null> {
  const { pathname } = new URL(request.url);

  if (
    !pathname.endsWith("/sign-up/email") &&
    !pathname.endsWith("/reset-password")
  ) {
    return null;
  }

  const body = (await request
    .clone()
    .json()
    .catch(() => null)) as { password?: string; newPassword?: string } | null;

  const password = body?.password ?? body?.newPassword;

  if (!password) {
    return null;
  }

  const result = validatePasswordStrength(password);

  if (!result.valid) {
    return Response.json(
      {
        code: "VALIDATION_ERROR",
        message: result.message ?? "Password does not meet security requirements",
      },
      { status: 400 },
    );
  }

  return null;
}

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request.headers.get("origin"));
}

export async function GET(request: Request) {
  const response = await getHandler().GET(request);
  return applyCorsHeaders(response, request.headers.get("origin"));
}

export async function POST(request: Request) {
  const rateLimitResponse = await enforceAuthRateLimit(request);
  if (rateLimitResponse) {
    return applyCorsHeaders(rateLimitResponse, request.headers.get("origin"));
  }

  const passwordValidationResponse = await validateSignUpPassword(request);
  if (passwordValidationResponse) {
    return applyCorsHeaders(
      passwordValidationResponse,
      request.headers.get("origin"),
    );
  }

  const response = await getHandler().POST(request);
  return applyCorsHeaders(response, request.headers.get("origin"));
}
