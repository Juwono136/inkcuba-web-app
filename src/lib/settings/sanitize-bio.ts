import "server-only";

import sanitizeHtml from "sanitize-html";

import { BIO_MAX_PLAIN_LENGTH } from "@/lib/settings/bio-limits";

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
    "h1",
    "h2",
    "h3",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      rel: "noopener noreferrer",
      target: "_blank",
    }),
  },
};

export function sanitizeBioHtml(html: string | undefined | null): string | null {
  if (html == null) return null;

  const trimmed = html.trim();
  if (!trimmed || trimmed === "<p></p>") return null;

  return sanitizeHtml(trimmed, SANITIZE_OPTIONS);
}

export function plainTextFromHtml(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}

export function assertBioLength(html: string | null): void {
  if (!html) return;

  const plain = plainTextFromHtml(html);

  if (plain.length > BIO_MAX_PLAIN_LENGTH) {
    throw new Error(
      `Bio must be at most ${BIO_MAX_PLAIN_LENGTH} characters (excluding formatting)`,
    );
  }
}

export { BIO_MAX_PLAIN_LENGTH } from "@/lib/settings/bio-limits";
