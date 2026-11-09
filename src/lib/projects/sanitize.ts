import "server-only";

import sanitizeHtml from "sanitize-html";

import { ValidationError } from "@/lib/api/errors";
import { PROJECT_DESCRIPTION_MAX_PLAIN } from "@/lib/projects/limits";

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "a"],
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      rel: "noopener noreferrer",
      target: "_blank",
    }),
  },
};

export function sanitizeProjectDescription(html: string | null | undefined): string | null {
  if (html == null) return null;
  const trimmed = html.trim();
  if (!trimmed || trimmed === "<p></p>" || trimmed === "<p><br></p>") return null;
  const cleaned = sanitizeHtml(trimmed, SANITIZE_OPTIONS).trim();
  if (!cleaned || cleaned === "<p></p>") return null;
  const plain = sanitizeHtml(cleaned, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length > PROJECT_DESCRIPTION_MAX_PLAIN) {
    throw new ValidationError(
      `Description must be at most ${PROJECT_DESCRIPTION_MAX_PLAIN} characters, not counting formatting`,
    );
  }
  return cleaned;
}

export function plainProjectText(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}
