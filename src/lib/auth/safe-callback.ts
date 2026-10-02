/**
 * Returns a same-origin relative path suitable for post-auth redirects.
 * Rejects protocol-relative URLs, absolute URLs, and empty values (open-redirect safe).
 */
export function getSafeInternalPath(
  value: string | null | undefined,
): string | null {
  if (!value) return null;

  let decoded = value.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    return null;
  }

  decoded = decoded.trim();
  if (!decoded.startsWith("/")) return null;
  if (decoded.startsWith("//")) return null;
  if (decoded.includes("://")) return null;
  if (decoded.includes("\\")) return null;

  // Keep users inside the app; block nested auth loops.
  if (
    decoded === "/auth/sign-in" ||
    decoded.startsWith("/auth/sign-in?") ||
    decoded === "/auth/sign-up" ||
    decoded.startsWith("/auth/sign-up?")
  ) {
    return null;
  }

  return decoded;
}
