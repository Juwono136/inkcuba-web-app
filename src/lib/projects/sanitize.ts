import "server-only";

import sanitizeHtml from "sanitize-html";

import { ValidationError } from "@/lib/api/errors";
import {
  PROJECT_DESCRIPTION_MAX_PLAIN,
  PROJECT_FEEDBACK_MAX,
} from "@/lib/projects/limits";

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

function cleanRichHtml(html: string | null | undefined): string | null {
  if (html == null) return null;
  const trimmed = html.trim();
  if (!trimmed || trimmed === "<p></p>" || trimmed === "<p><br></p>") return null;
  const cleaned = sanitizeHtml(trimmed, SANITIZE_OPTIONS).trim();
  if (!cleaned || cleaned === "<p></p>") return null;
  return cleaned;
}

export function sanitizeProjectDescription(html: string | null | undefined): string | null {
  const cleaned = cleanRichHtml(html);
  if (!cleaned) return null;
  const plain = plainProjectText(cleaned);
  if (plain.length > PROJECT_DESCRIPTION_MAX_PLAIN) {
    throw new ValidationError(
      `Description must be at most ${PROJECT_DESCRIPTION_MAX_PLAIN} characters, not counting formatting`,
    );
  }
  return cleaned;
}

/** Lecturer feedback (publish note or revision request). XSS-safe HTML, plain-length capped. */
export function sanitizeProjectFeedback(
  html: string | null | undefined,
  options?: { required?: boolean },
): string | null {
  const cleaned = cleanRichHtml(html);
  if (!cleaned) {
    if (options?.required) {
      throw new ValidationError("Feedback is required when you request a revision");
    }
    return null;
  }
  const plain = plainProjectText(cleaned);
  if (plain.length > PROJECT_FEEDBACK_MAX) {
    throw new ValidationError(
      `Feedback must be at most ${PROJECT_FEEDBACK_MAX} characters, not counting formatting`,
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
