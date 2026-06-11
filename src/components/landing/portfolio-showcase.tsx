"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Filter, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { PortfolioShowcaseCard } from "@/components/portfolio/portfolio-showcase-card";
import { Button } from "@/components/ui/button";
import { showcasePortfolios } from "@/data/showcase-portfolios";
import { siteConfig } from "@/config/site";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import {
  filterShowcasePortfolios,
  portfolioCategories,
} from "@/lib/showcase/filters";
import type { PortfolioCategory, PortfolioSort } from "@/types/showcase";
import { cn } from "@/lib/utils";

const sortOptions: { value: PortfolioSort; label: string }[] = [
  { value: "latest", label: "Latest" },
  { value: "trending", label: "Most Viewed" },
  { value: "top-rated", label: "Top Rated" },
];

function getBentoLayout(index: number, total: number) {
  if (index === 0) return "lg:col-span-2 lg:row-span-2";
  if (index === 3) return "lg:col-span-2";
  if (index === total - 1 && total > 4) return "sm:col-span-2 lg:col-span-1";
  return "";
}

export function PortfolioShowcase() {
  const [category, setCategory] = useState<PortfolioCategory>("All");
  const [sort, setSort] = useState<PortfolioSort>("latest");

  const filtered = useMemo(
    () => filterShowcasePortfolios(showcasePortfolios, category, sort),
    [category, sort],
  );

  const [featured, ...rest] = filtered;

  return (
    <section id="showcase" className="scroll-mt-24 py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="space-y-8"
        >
          <motion.div variants={fadeInUp} className="max-w-3xl space-y-3">
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-sky-500">
              <Sparkles className="h-4 w-4" />
              Verified Exhibition
            </p>
            <h2 className="font-heading text-3xl font-bold text-slate-900 sm:text-4xl">
              Explore published student portfolios
            </h2>
            <p className="text-base leading-relaxed text-slate-600">
              A curated gallery of faculty-approved projects — use the gallery
              controls to sort, filter, and dive into student work across BINUS
              programs.
            </p>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="grid gap-6 lg:grid-cols-[260px_1fr] xl:grid-cols-[280px_1fr]"
          >
            {/* Sticky filter sidebar */}
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl border-2 border-slate-900 bg-white p-5 shadow-inkcuba">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Filter className="h-4 w-4 text-sky-500" />
                  Gallery controls
                </div>

                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Sort by
                </p>
                <div className="space-y-1.5">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSort(option.value)}
                      className={cn(
                        "w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-all",
                        sort === option.value
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Category
                </p>
                <div className="flex flex-wrap gap-1.5 lg:flex-col lg:gap-1">
                  {portfolioCategories.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCategory(item)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-left text-sm font-medium transition-all",
                        category === item
                          ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
                          : "text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      {item}
                    </button>
                  ))}
                </div>

                <Button
                  asChild
                  variant="outline"
                  className="mt-6 w-full border-2 border-slate-900"
                >
                  <Link href={siteConfig.links.explore}>
                    View full gallery
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </aside>

            {/* Bento gallery */}
            <div className="min-w-0">
              <AnimatePresence mode="popLayout">
                {filtered.length > 0 ? (
                  <motion.div
                    key={`${category}-${sort}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  >
                    {featured ? (
                      <div className={getBentoLayout(0, filtered.length)}>
                        <PortfolioShowcaseCard
                          portfolio={featured}
                          variant="featured"
                        />
                      </div>
                    ) : null}

                    {rest.map((portfolio, index) => {
                      const layoutIndex = index + 1;
                      const useCompact =
                        layoutIndex % 5 === 2 || layoutIndex % 5 === 4;

                      return (
                        <div
                          key={portfolio.id}
                          className={getBentoLayout(layoutIndex, filtered.length)}
                        >
                          <PortfolioShowcaseCard
                            portfolio={portfolio}
                            variant={useCompact ? "compact" : "default"}
                          />
                        </div>
                      );
                    })}
                  </motion.div>
                ) : (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm text-slate-500"
                  >
                    No portfolios match this filter yet. Try another category or
                    visit the full gallery.
                  </motion.p>
                )}
              </AnimatePresence>

              <p className="mt-4 text-center text-xs text-slate-400 lg:text-left">
                Showing {filtered.length} verified portfolio
                {filtered.length === 1 ? "" : "s"}
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
