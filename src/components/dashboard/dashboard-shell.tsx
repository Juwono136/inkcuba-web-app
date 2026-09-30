type DashboardShellProps = {
  title: string;
  description: string;
  children?: React.ReactNode;
};

/** Page header + content for student/lecturer workspace pages (shell provides chrome). */
export function DashboardShell({
  title,
  description,
  children,
}: DashboardShellProps) {
  return (
    <div>
      <div className="mb-6 space-y-1.5 sm:mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}
