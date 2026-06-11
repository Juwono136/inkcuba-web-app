"use client";

import { motion } from "framer-motion";
import { BadgeCheck, Eye, Users } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { ShowcasePortfolio } from "@/types/showcase";
import { cn } from "@/lib/utils";

type PortfolioCardProps = {
  portfolio: ShowcasePortfolio;
};

export function PortfolioCard({ portfolio }: PortfolioCardProps) {
  const isGroup = portfolio.type === "GROUP";

  return (
    <motion.article
      whileHover={{ y: -4, x: 4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="group"
    >
      <Link
        href={`/explore/${portfolio.slug}`}
        className="block rounded-xl border-2 border-slate-900 bg-white p-4 shadow-inkcuba transition-shadow duration-200 hover:shadow-none"
      >
        <div
          className={cn(
            "relative aspect-video overflow-hidden rounded-lg border border-slate-900/10 bg-gradient-to-br",
            portfolio.posterClass,
          )}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_50%)]" />
          <div className="absolute bottom-3 left-3 right-3">
            <p className="font-heading line-clamp-2 text-sm font-bold text-white drop-shadow-md sm:text-base">
              {portfolio.title}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
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
            Verified by {portfolio.lecturerName.split(" ")[0]}
          </span>
        </div>

        <h3 className="font-heading mt-3 truncate text-lg font-semibold text-slate-900">
          {portfolio.title}
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          {portfolio.studentName} · {portfolio.major} · Batch {portfolio.batch}
        </p>

        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">
          {portfolio.description}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {portfolio.technologyTags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span>
            {portfolio.courseCode} · {portfolio.courseName}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {portfolio.viewCount.toLocaleString()}
          </span>
        </div>
      </Link>
    </motion.article>
  );
}
