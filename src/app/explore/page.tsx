import Link from "next/link";

import { PortfolioCard } from "@/components/portfolio/portfolio-card";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { showcasePortfolios } from "@/data/showcase-portfolios";

type ExplorePageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const { q } = await searchParams;
  const query = q?.trim().toLowerCase() ?? "";

  const results = query
    ? showcasePortfolios.filter((portfolio) => {
        const haystack = [
          portfolio.title,
          portfolio.studentName,
          portfolio.major,
          portfolio.courseCode,
          portfolio.courseName,
          portfolio.lecturerName,
          ...portfolio.technologyTags,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      })
    : showcasePortfolios;

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-2">
          <h1 className="font-heading text-3xl font-bold text-slate-900">
            Portfolio Gallery
          </h1>
          <p className="text-slate-600">
            {query
              ? `Showing results for "${q}"`
              : "Browse all faculty-verified portfolios published on inkcuba."}
          </p>
        </div>

        {results.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {results.map((portfolio) => (
              <PortfolioCard key={portfolio.id} portfolio={portfolio} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <p className="text-slate-600">No portfolios matched your search.</p>
            <Button asChild className="mt-4 bg-sky-500 hover:bg-sky-600">
              <Link href="/">Back to exhibition</Link>
            </Button>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
