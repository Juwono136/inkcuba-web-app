import { NextRequest } from "next/server";

import { apiSuccess, handleApiError } from "@/lib/api/response";
import { getSettingsForUser } from "@/lib/settings/get-settings";
import { requireApiSession } from "@/lib/settings/require-api-session";
import { updatePublicProfile } from "@/lib/settings/update-profile";

export async function PATCH(request: NextRequest) {
  try {
    const { session, role } = await requireApiSession();
    const body = await request.json();

    await updatePublicProfile({
      userId: session.user.id,
      role,
      data: body,
    });

    const settings = await getSettingsForUser(session.user.id);

    return apiSuccess(settings);
  } catch (error) {
    return handleApiError(error, "settings-profile-patch");
  }
}
