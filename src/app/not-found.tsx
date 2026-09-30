"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Compass, Home } from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[linear-gradient(165deg,#F8FAFC_0%,#EEF6FF_42%,#F8FAFC_100%)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.35) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <header className="relative z-10 border-b-2 border-slate-900/10 bg-white/70 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <BrandLogo size="sm" />
          </Link>
          <p className="hidden text-xs font-semibold tracking-wide text-slate-500 uppercase sm:block">
            Page not found
          </p>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full max-w-xl text-center"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.08, duration: 0.4 }}
            className="mx-auto mb-8 inline-flex items-center justify-center rounded-3xl border-2 border-slate-900 bg-white px-8 py-5 shadow-inkcuba"
          >
            <span className="font-heading text-6xl font-bold tracking-tight text-slate-900 sm:text-7xl">
              404
            </span>
          </motion.div>

          <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            This page wandered off campus
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600 sm:text-base">
            The link may be broken, outdated, or mistyped. Head back to inkcuba
            and continue exploring verified BINUS portfolios.
          </p>

          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button
              asChild
              size="lg"
              className="bg-sky-500 shadow-inkcuba hover:bg-sky-600"
            >
              <Link href="/">
                <Home className="h-4 w-4" />
                Back to home
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-2 border-slate-900 bg-white"
            >
              <Link href={siteConfig.links.explore}>
                <Compass className="h-4 w-4" />
                Explore portfolios
              </Link>
            </Button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                window.history.back();
                return;
              }
              window.location.href = "/";
            }}
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-sky-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Go back
          </button>
        </motion.div>
      </main>

      <footer className="relative z-10 border-t border-slate-200/80 bg-white/60 px-4 py-4 text-center text-xs text-slate-500 backdrop-blur sm:px-6">
        © {new Date().getFullYear()} {siteConfig.name}. Verified academic
        portfolios for BINUS University.
      </footer>
    </div>
  );
}
