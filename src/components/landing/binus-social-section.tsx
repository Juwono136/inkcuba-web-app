"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import Link from "next/link";

import { binusLinks } from "@/data/binus-links";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";

export function BinusSocialSection() {
  return (
    <section className="relative overflow-hidden py-14 sm:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 0% 50%, rgba(14,165,233,0.12), transparent 40%), radial-gradient(circle at 100% 50%, rgba(139,92,246,0.1), transparent 40%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="space-y-10"
        >
          <motion.div
            variants={fadeInUp}
            className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
          >
            <div className="max-w-2xl space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-500">
                Connect with BINUS
              </p>
              <h2 className="font-heading text-3xl font-bold text-slate-900 sm:text-4xl">
                Official channels & social media
              </h2>
              <p className="text-base leading-relaxed text-slate-600">
                inkcuba is part of the BINUS academic ecosystem. Explore the
                university&apos;s official website and social platforms for news,
                events, and community updates.
              </p>
            </div>

            <Link
              href="https://www.binus.ac.id/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-2 rounded-full border-2 border-slate-900 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-inkcuba transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-inkcuba-hover"
            >
              Visit binus.ac.id
              <ExternalLink className="h-4 w-4" />
            </Link>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {binusLinks.map((link, index) => (
              <motion.div
                key={link.id}
                variants={fadeInUp}
                className={cn(index === 0 && "sm:col-span-2 lg:col-span-1")}
              >
                <Link
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex h-full flex-col overflow-hidden rounded-2xl border-2 border-slate-900 bg-white p-5 shadow-inkcuba transition-all duration-200 hover:-translate-y-1 hover:shadow-none sm:p-6"
                >
                  <div
                    className={cn(
                      "mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md",
                      link.accent,
                    )}
                  >
                    <link.icon className="h-5 w-5" />
                  </div>

                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-heading text-lg font-semibold text-slate-900">
                        {link.label}
                      </h3>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-sky-500" />
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {link.description}
                    </p>
                  </div>

                  <span className="mt-4 text-xs font-medium text-sky-600 opacity-0 transition-opacity group-hover:opacity-100">
                    Open external link →
                  </span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
