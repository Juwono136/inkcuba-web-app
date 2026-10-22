/**
 * Client-safe helpers to rewrite SeaweedFS object URLs into the app media proxy.
 * Browsers must never hit STORAGE_ENDPOINT directly (Basic Auth prompt).
 */

const ALLOWED_PREFIXES = ["avatars/", "workspaces/"] as const;
const MEDIA_PROXY_PREFIX = "/api/media/";

export function extractStorageMediaKey(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (ALLOWED_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
    return trimmed.split("?")[0] ?? trimmed;
  }

  const proxyIndex = trimmed.indexOf(MEDIA_PROXY_PREFIX);
  if (proxyIndex !== -1) {
    const key =
      trimmed.slice(proxyIndex + MEDIA_PROXY_PREFIX.length).split("?")[0] ?? "";
    return key && isAllowedMediaKey(key) ? key : null;
  }

  for (const prefix of ALLOWED_PREFIXES) {
    const marker = `/${prefix}`;
    const index = trimmed.indexOf(marker);
    if (index !== -1) {
      return trimmed.slice(index + 1).split("?")[0] ?? null;
    }
  }

  return null;
}

export function isAllowedMediaKey(key: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix));
}

/**
 * Resolve any stored media reference (raw key, proxy path, or absolute
 * SeaweedFS URL) into a browser-safe `/api/media/...` path.
 * External URLs (e.g. Dicebear) are returned unchanged.
 */
export function resolveMediaUrl(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const key = extractStorageMediaKey(trimmed);
  if (key && isAllowedMediaKey(key)) {
    return `${MEDIA_PROXY_PREFIX}${key}`;
  }

  // Absolute storage URLs without a recognized key must not be exposed.
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      // Common local/dev SeaweedFS ports and path shapes — never leak to UI.
      if (
        url.port === "8333" ||
        url.pathname.includes("/inkcuba/") ||
        /seaweed|filer|s3/i.test(url.hostname)
      ) {
        return null;
      }
    } catch {
      return null;
    }
  }

  return trimmed;
}

/** Rewrite `<img src>` values inside HTML that point at object storage. */
export function rewriteStorageUrlsInHtml(
  html: string | null | undefined,
): string | null {
  if (html == null) return null;
  const trimmed = html.trim();
  if (!trimmed) return null;

  return trimmed.replace(
    /(<img\b[^>]*\bsrc=["'])([^"']+)(["'][^>]*>)/gi,
    (_match, prefix: string, src: string, suffix: string) => {
      const resolved = resolveMediaUrl(src) ?? src;
      return `${prefix}${resolved}${suffix}`;
    },
  );
}
