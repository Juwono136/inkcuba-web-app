const AVATAR_KEY_PREFIX = "avatars/";

export function extractAvatarStorageKey(url: string): string | null {
  const marker = `/${AVATAR_KEY_PREFIX}`;
  const index = url.indexOf(marker);

  if (index === -1) {
    return null;
  }

  return url.slice(index + 1);
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
