const AVATAR_KEY_PREFIX = "avatars/";

/**
 * Extract a SeaweedFS avatar object key from a stored image URL.
 * Supports full storage URLs, media proxy paths, and raw keys.
 */
export function extractAvatarStorageKey(url: string): string | null {
  const trimmed = url.trim();

  if (!trimmed) return null;

  if (trimmed.startsWith(AVATAR_KEY_PREFIX)) {
    return trimmed.split("?")[0] ?? trimmed;
  }

  const apiMarker = "/api/media/avatars/";
  const apiIndex = trimmed.indexOf(apiMarker);

  if (apiIndex !== -1) {
    return (trimmed.slice(apiIndex + "/api/media/".length).split("?")[0] ?? null);
  }

  const marker = `/${AVATAR_KEY_PREFIX}`;
  const index = trimmed.indexOf(marker);

  if (index === -1) {
    return null;
  }

  return trimmed.slice(index + 1).split("?")[0] ?? null;
}

export function resolveUserImageUrl(
  image: string | null | undefined,
): string | null {
  if (!image) {
    return null;
  }

  const storageKey = extractAvatarStorageKey(image);

  if (storageKey?.startsWith(AVATAR_KEY_PREFIX)) {
    return `/api/media/${storageKey}`;
  }

  return image;
}

export function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}
