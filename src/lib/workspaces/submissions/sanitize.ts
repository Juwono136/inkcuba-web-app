import "server-only";

import sanitizeHtml from "sanitize-html";

import { ValidationError } from "@/lib/api/errors";
import { SUBMISSION_DESCRIPTION_MAX_PLAIN } from "@/lib/workspaces/submissions/types";

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "a"],
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

export function sanitizeSubmissionDescription(
  html: string | undefined | null,
): string | null {
  if (html == null) return null;
  const trimmed = html.trim();
  if (!trimmed || trimmed === "<p></p>" || trimmed === "<p><br></p>") {
    return null;
  }

  const cleaned = sanitizeHtml(trimmed, SANITIZE_OPTIONS).trim();
  if (!cleaned || cleaned === "<p></p>") return null;

  const plain = sanitizeHtml(cleaned, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length > SUBMISSION_DESCRIPTION_MAX_PLAIN) {
    throw new ValidationError(
      `Description must be at most ${SUBMISSION_DESCRIPTION_MAX_PLAIN} characters (excluding formatting)`,
    );
  }

  return cleaned;
}
