const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type AvatarUploadResult = {
  url: string;
  key: string;
};

export type AvatarValidationResult =
  | { valid: true }
  | { valid: false; message: string };

export function validateAvatarFile(file: File): AvatarValidationResult {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type as (typeof ALLOWED_AVATAR_TYPES)[number])) {
    return {
      valid: false,
      message: "Profile image must be JPG, PNG, or WebP.",
    };
  }

  if (file.size > MAX_AVATAR_SIZE) {
    return {
      valid: false,
      message: "Profile image must be under 2MB.",
    };
  }

  return { valid: true };
}

export async function uploadProfileAvatar(
  file: File,
  email: string,
): Promise<AvatarUploadResult> {
  const validation = validateAvatarFile(file);

  if (!validation.valid) {
    throw new Error(validation.message);
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("email", email.trim().toLowerCase());

  const response = await fetch("/api/auth/avatar", {
    method: "POST",
    body: formData,
  });

  const data = (await response.json()) as {
    success: boolean;
    data?: AvatarUploadResult;
    error?: { message: string };
  };

  if (!response.ok || !data.success || !data.data?.url) {
    throw new Error(
      data.error?.message ??
        "Failed to upload profile image. Please try again or skip this step.",
    );
  }

  return data.data;
}

export async function deleteProfileAvatar(key: string): Promise<void> {
  const response = await fetch(
    `/api/auth/avatar?key=${encodeURIComponent(key)}`,
    { method: "DELETE" },
  );

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: { message: string };
    } | null;

    throw new Error(
      data?.error?.message ?? "Failed to clean up uploaded profile image",
    );
  }
}
