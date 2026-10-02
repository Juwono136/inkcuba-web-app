type DashboardShellProps = {
  title: string;
  description: string;
  children?: React.ReactNode;
  /** When true, skip the page title block (client page supplies its own). */
  hideHeader?: boolean;
};

/** Page header + content for student/lecturer workspace pages (shell provides chrome). */
export function DashboardShell({
  title,
  description,
  children,
  hideHeader = false,
}: DashboardShellProps) {
  return (
    <div>
      {!hideHeader ? (
        <div className="mb-6 space-y-1.5 sm:mb-8">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            {description}
          </p>
        </div>
      ) : null}
      {children}
    </div>
  );
}
