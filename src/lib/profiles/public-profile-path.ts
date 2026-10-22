/** Client-safe helper for building public profile paths (BINUSIAN ID on `nim`). */
export function getPublicProfileHref(input: {
  id: string;
  nim?: string | null;
  /** @deprecated role no longer required — kept for call-site compatibility */
  role?: string | null;
}): string {
  const binusianId = input.nim?.trim();
  if (binusianId) {
    return `/u/${encodeURIComponent(binusianId)}`;
  }
  return `/u/${encodeURIComponent(input.id)}`;
}
