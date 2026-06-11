"use client";

import { motion } from "framer-motion";
import { BadgeCheck, Eye, Users } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { ShowcasePortfolio } from "@/types/showcase";
import { cn } from "@/lib/utils";

type PortfolioShowcaseCardProps = {
  portfolio: ShowcasePortfolio;
  variant?: "default" | "featured" | "compact";
};

export function PortfolioShowcaseCard({
  portfolio,
  variant = "default",
}: PortfolioShowcaseCardProps) {
  const isGroup = portfolio.type === "GROUP";
  const isFeatured = variant === "featured";
  const isCompact = variant === "compact";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      whileHover={{ y: -3 }}
      className="group h-full"
    >
      <Link
        href={`/explore/${portfolio.slug}`}
        className={cn(
          "flex h-full flex-col rounded-2xl border-2 border-slate-900 bg-white shadow-inkcuba transition-shadow duration-200 hover:shadow-none",
          isFeatured ? "p-5 sm:p-6" : isCompact ? "p-3.5" : "p-4",
        )}
      >
        <div
          className={cn(
            "relative overflow-hidden rounded-xl border border-slate-900/10 bg-gradient-to-br",
            portfolio.posterClass,
            isFeatured ? "aspect-[16/10] sm:aspect-[16/9]" : "aspect-video",
            isCompact && "aspect-[4/3]",
          )}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_50%)]" />
          {isFeatured ? (
            <div className="absolute left-4 top-4 rounded-full border border-white/30 bg-black/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
              Spotlight
            </div>
          ) : null}
          <div className="absolute bottom-3 left-3 right-3">
            <p
              className={cn(
                "font-heading font-bold text-white drop-shadow-md",
                isFeatured ? "text-lg sm:text-2xl" : "line-clamp-2 text-sm sm:text-base",
              )}
            >
              {portfolio.title}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "mt-4 flex items-center justify-between gap-2",
            isCompact && "mt-3",
          )}
        >
          <Badge
            className={cn(
              "border",
              isGroup
                ? "border-purple-500 bg-purple-500/10 text-purple-600"
                : "border-orange-500 bg-orange-500/10 text-orange-600",
            )}
          >
            {isGroup ? (
              <>
                <Users className="h-3 w-3" />
                Group
              </>
            ) : (
              "Individual"
            )}
          </Badge>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
            <BadgeCheck className="h-3.5 w-3.5" />
            {portfolio.lecturerName.split(" ")[0]}
          </span>
        </div>

        {!isCompact ? (
          <>
            <h3 className="font-heading mt-3 truncate text-lg font-semibold text-slate-900">
              {portfolio.title}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {portfolio.studentName} · {portfolio.major}
            </p>
            {isFeatured ? (
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">
                {portfolio.description}
              </p>
            ) : (
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">
                {portfolio.description}
              </p>
            )}
          </>
        ) : (
          <p className="mt-2 truncate text-sm font-medium text-slate-700">
            {portfolio.studentName}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4 text-xs text-slate-500">
          <div className="flex flex-wrap gap-1.5">
            {portfolio.technologyTags.slice(0, isFeatured ? 4 : 2).map((tag) => (
              <span
                key={tag}
                className="rounded bg-slate-100 px-2 py-0.5 text-slate-700"
              >
                {tag}
              </span>
            ))}
          </div>
          <span className="inline-flex shrink-0 items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {portfolio.viewCount.toLocaleString()}
          </span>
        </div>
      </Link>
    </motion.article>
  );
}
