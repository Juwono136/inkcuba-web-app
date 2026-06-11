"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { fadeInUp } from "@/lib/animations";

export function CtaSection() {
  return (
    <section className="pb-16 sm:pb-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="relative overflow-hidden rounded-3xl border-2 border-slate-900 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-10 text-center sm:px-10 sm:py-14"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle at 10% 20%, rgba(14,165,233,0.5), transparent 35%), radial-gradient(circle at 90% 80%, rgba(139,92,246,0.35), transparent 40%)",
            }}
          />

          <div className="relative space-y-6">
            <div className="flex justify-center">
              <div className="rounded-2xl border border-white/10 bg-white/95 px-5 py-3 shadow-lg">
                <BrandLogo size="md" />
              </div>
            </div>
            <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl">
              Ready to showcase verified academic work?
            </h2>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Join inkcuba to manage course portfolios, earn faculty-verified
              credentials, and build a professional presence recognized across
              BINUS University.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="w-full bg-sky-500 hover:bg-sky-400 sm:w-auto"
              >
                <Link href={siteConfig.links.signUp}>Get Started Free</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full border-white/50 bg-white/10 text-white hover:border-white hover:bg-white hover:text-slate-900 sm:w-auto"
              >
                <Link href={siteConfig.links.explore}>Browse Portfolios</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
