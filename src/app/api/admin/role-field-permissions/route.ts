import { NextRequest } from "next/server";

import { requireAdminApi } from "@/lib/admin/require-admin-api";
import { ValidationError } from "@/lib/api/errors";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/redis";
import {
  bulkUpsertRoleFieldPermissions,
  getRoleFieldPermissionMatrix,
  listRoleFieldPermissions,
} from "@/lib/role-field-permissions/service";
import { roleFieldPermissionBulkUpsertSchema } from "@/lib/role-field-permissions/validators";
import {
  ROLE_RELEVANT_IDENTITY_FIELDS,
  SETTINGS_IDENTITY_FIELD_LABELS,
  SETTINGS_IDENTITY_FIELDS,
} from "@/lib/role-field-permissions/types";

function clientMeta(request: NextRequest) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip"),
    userAgent: request.headers.get("user-agent"),
  };
}

export async function GET() {
  try {
    const { session } = await requireAdminApi();
    const limit = await rateLimit(
      `admin-role-field-perms:${session.user.id}`,
      60,
      60,
    );
    if (!limit.success) {
      throw new ValidationError("Too many requests. Please wait a moment.");
    }

    const [matrix, items] = await Promise.all([
      getRoleFieldPermissionMatrix(),
      listRoleFieldPermissions(),
    ]);

    return apiSuccess({
      matrix,
      items,
      fields: SETTINGS_IDENTITY_FIELDS,
      fieldLabels: SETTINGS_IDENTITY_FIELD_LABELS,
      relevantByRole: ROLE_RELEVANT_IDENTITY_FIELDS,
    });
  } catch (error) {
    return handleApiError(error, "admin-role-field-permissions-list");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { session } = await requireAdminApi();
    const limit = await rateLimit(
      `admin-role-field-perms-put:${session.user.id}`,
      30,
      60,
    );
    if (!limit.success) {
      throw new ValidationError("Too many requests. Please wait a moment.");
    }

    const body = await request.json().catch(() => null);
    const parsed = roleFieldPermissionBulkUpsertSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid payload", parsed.error.flatten());
    }

    const meta = clientMeta(request);
    const matrix = await bulkUpsertRoleFieldPermissions({
      data: parsed.data,
      actorId: session.user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return apiSuccess({ matrix });
  } catch (error) {
    return handleApiError(error, "admin-role-field-permissions-put");
  }
}
