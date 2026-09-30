import { NextRequest } from "next/server";

import {
  ensureDefaultDirectoryOptions,
  listDirectoryOptions,
} from "@/lib/directory/service";
import { directoryOptionCategorySchema } from "@/lib/directory/validators";
import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/redis";
import type { DirectoryOptionCategory } from "@/lib/directory/types";

/**
 * Public/authenticated read of active directory options (for selects).
 * No admin role required — values are non-sensitive institutional labels.
 */
export async function GET(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "anon";
    const limit = await rateLimit(`directory-options:${ip}`, 120, 60);
    if (!limit.success) {
      throw new ValidationError("Too many requests. Please wait a moment.");
    }

    await ensureDefaultDirectoryOptions();

    const categoryRaw = request.nextUrl.searchParams.get("category");
    const parsed = categoryRaw
      ? directoryOptionCategorySchema.safeParse(categoryRaw)
      : { success: true as const, data: undefined };

    if (!parsed.success) {
      throw new ValidationError("Invalid category");
    }

    const items = await listDirectoryOptions({
      category: parsed.data as DirectoryOptionCategory | undefined,
      activeOnly: true,
    });

    return apiSuccess({
      items: items.map((item) => ({
        label: item.label,
        value: item.value,
        category: item.category,
      })),
    });
  } catch (error) {
    return handleApiError(error, "directory-options-public");
  }
}
