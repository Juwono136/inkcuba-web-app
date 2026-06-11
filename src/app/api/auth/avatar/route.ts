import { NextRequest } from "next/server";

import { ValidationError } from "@/lib/api/errors";
import { isAllowedInstitutionalEmail } from "@/lib/auth/permissions";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/redis";
import {
  deleteRegisterAvatar,
  uploadAvatarToStorage,
} from "@/lib/storage/avatar";

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limit = await rateLimit(`avatar-upload:${ip}`, 10, 60 * 15);

    if (!limit.success) {
      throw new ValidationError(
        "Too many upload attempts. Please try again later.",
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const email = formData.get("email");

    if (!(file instanceof File)) {
      throw new ValidationError("No profile image provided");
    }

    if (typeof email !== "string" || !isAllowedInstitutionalEmail(email)) {
      throw new ValidationError("A valid BINUS email is required for avatar upload");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadAvatarToStorage({
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      buffer,
      ownerEmail: email,
    });

    return apiSuccess({ url: result.url, key: result.key });
  } catch (error) {
    return handleApiError(error, "avatar-upload");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get("key");

    if (!key) {
      throw new ValidationError("Avatar storage key is required");
    }

    await deleteRegisterAvatar(key);

    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error, "avatar-delete");
  }
}
