export function formatAdminDateTime(value: string | null | undefined): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatAdminRelativeDays(days: number | null | undefined): string {
  if (days == null) return "—";
  if (days <= 0) return "Purge soon";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}
