import { NextRequest } from "next/server";

import { apiSuccess, handleApiError } from "@/lib/api/response";
import { getSettingsForUser } from "@/lib/settings/get-settings";
import { requireApiSession } from "@/lib/settings/require-api-session";

export async function GET(_request: NextRequest) {
  try {
    const { session } = await requireApiSession();
    const settings = await getSettingsForUser(session.user.id);

    return apiSuccess(settings);
  } catch (error) {
    return handleApiError(error, "settings-get");
  }
}
