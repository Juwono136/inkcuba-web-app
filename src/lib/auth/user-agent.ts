export type ParsedUserAgent = {
  label: string;
  browser: string;
  os: string;
  deviceType: "desktop" | "mobile" | "tablet" | "unknown";
};

/**
 * Lightweight UA parsing (no extra dependency) for login history UI.
 */
export function parseUserAgent(
  userAgent: string | null | undefined,
): ParsedUserAgent {
  const ua = userAgent?.trim() || "";

  if (!ua) {
    return {
      label: "Unknown device",
      browser: "Unknown browser",
      os: "Unknown OS",
      deviceType: "unknown",
    };
  }

  const deviceType: ParsedUserAgent["deviceType"] = /ipad|tablet/i.test(ua)
    ? "tablet"
    : /mobi|iphone|android(?!.*tablet)/i.test(ua)
      ? "mobile"
      : "desktop";

  let browser = "Unknown browser";
  if (/edg\//i.test(ua)) browser = "Microsoft Edge";
  else if (/opr\/|opera/i.test(ua)) browser = "Opera";
  else if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua)) browser = "Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua))
    browser = "Safari";
  else if (/samsungbrowser/i.test(ua)) browser = "Samsung Internet";

  let os = "Unknown OS";
  if (/windows nt/i.test(ua)) os = "Windows";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/mac os x/i.test(ua)) os = "macOS";
  else if (/cros/i.test(ua)) os = "Chrome OS";
  else if (/linux/i.test(ua)) os = "Linux";

  return {
    label: `${browser} on ${os}`,
    browser,
    os,
    deviceType,
  };
}
