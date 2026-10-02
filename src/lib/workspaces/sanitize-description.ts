import "server-only";

import sanitizeHtml from "sanitize-html";

import { WORKSPACE_DESCRIPTION_MAX_PLAIN } from "@/lib/workspaces/types";

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "ul",
    "ol",
    "li",
    "a",
    "img",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "title"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      rel: "noopener noreferrer",
      target: "_blank",
    }),
  },
  exclusiveFilter(frame) {
    if (frame.tag !== "img") return false;
    const src = frame.attribs?.src ?? "";
    return !isAllowedWorkspaceImageSrc(src);
  },
};

export function isAllowedWorkspaceImageSrc(src: string): boolean {
  const trimmed = src.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith("/api/media/workspaces/")) return true;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return url.pathname.includes("/api/media/workspaces/");
  } catch {
    return trimmed.startsWith("workspaces/");
  }
}

export function sanitizeWorkspaceDescriptionHtml(
  html: string | undefined | null,
): string | null {
  if (html == null) return null;

  const trimmed = html.trim();
  if (!trimmed || trimmed === "<p></p>" || trimmed === "<p><br></p>") {
    return null;
  }

  const cleaned = sanitizeHtml(trimmed, SANITIZE_OPTIONS);
  if (!cleaned || cleaned === "<p></p>") return null;
  return cleaned;
}

export function plainTextFromWorkspaceHtml(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}

export function assertWorkspaceDescriptionLength(html: string | null): void {
  if (!html) return;
  const plain = plainTextFromWorkspaceHtml(html);
  if (plain.length > WORKSPACE_DESCRIPTION_MAX_PLAIN) {
    throw new Error(
      `Description must be at most ${WORKSPACE_DESCRIPTION_MAX_PLAIN} characters (excluding formatting)`,
    );
  }
}

/** Extract SeaweedFS keys referenced by description `<img src>`. */
export function extractDescriptionImageKeys(html: string | null): string[] {
  if (!html) return [];

  const keys = new Set<string>();
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = re.exec(html)) !== null) {
    const src = match[1] ?? "";
    const key = extractWorkspaceMediaKeyFromSrc(src);
    if (key) keys.add(key);
  }

  return [...keys];
}

export function extractWorkspaceMediaKeyFromSrc(src: string): string | null {
  const trimmed = src.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("workspaces/")) {
    return trimmed.split("?")[0] ?? trimmed;
  }

  const marker = "/api/media/workspaces/";
  const index = trimmed.indexOf(marker);
  if (index !== -1) {
    return `workspaces/${trimmed.slice(index + marker.length).split("?")[0] ?? ""}`;
  }

  return null;
}

export function toMediaProxyUrl(key: string): string {
  return `/api/media/${key.replace(/^\//, "")}`;
}
