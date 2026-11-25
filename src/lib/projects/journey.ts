/** Map portfolio events → journey stage ISO timestamps (latest occurrence). */
export function buildJourneyStageTimestamps(
  events: Array<{ eventType: string; createdAt: Date | string }>,
  projectCreatedAt: Date | string,
): Record<
  "draft" | "submitted" | "in_review" | "revision" | "resubmitted" | "published" | "archived",
  string | null
> {
  const toIso = (value: Date | string) =>
    value instanceof Date ? value.toISOString() : new Date(value).toISOString();

  const latest = (type: string) => {
    let found: Date | string | null = null;
    for (const event of events) {
      if (event.eventType === type) found = event.createdAt;
    }
    return found ? toIso(found) : null;
  };

  return {
    draft: toIso(projectCreatedAt),
    submitted: latest("SUBMITTED"),
    in_review: latest("REVIEW_STARTED"),
    revision: latest("REVISION_REQUESTED"),
    resubmitted: latest("RESUBMITTED"),
    published: latest("PUBLISHED"),
    archived: latest("ARCHIVED"),
  };
}

export function formatJourneyWhen(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
