import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";

const stats = [
  { label: "Verified Portfolios", value: "120+" },
  { label: "Active Workspaces", value: "18" },
  { label: "Study Programs", value: "12+" },
  { label: "Faculty Reviewers", value: "45+" },
];

export default function StatsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-2">
          <h1 className="font-heading text-3xl font-bold text-slate-900">
            Campus Stats
          </h1>
          <p className="text-slate-600">
            Platform-wide metrics for inkcuba portfolio activity at BINUS University.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <article
              key={stat.label}
              className="rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-inkcuba"
            >
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="font-heading mt-2 text-4xl font-bold text-slate-900">
                {stat.value}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-8">
          <Button asChild variant="outline" className="border-2 border-slate-900">
            <Link href="/#showcase">Explore exhibition</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
