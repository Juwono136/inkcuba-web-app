"use client";

import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, GraduationCap, Layers } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { siteConfig } from "@/config/site";

const highlights = [
  {
    icon: BadgeCheck,
    label: "Faculty-verified only",
  },
  {
    icon: Layers,
    label: "Workspace-driven submissions",
  },
  {
    icon: GraduationCap,
    label: "Cross-program BINUS showcase",
  },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(14,165,233,0.18), transparent 42%), radial-gradient(circle at 80% 10%, rgba(139,92,246,0.14), transparent 38%), radial-gradient(circle at 70% 80%, rgba(249,115,22,0.12), transparent 40%)",
        }}
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:px-8 lg:py-20">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6 text-center lg:text-left"
        >
          <motion.div
            variants={fadeInUp}
            className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-sky-600"
          >
            inkcuba · BINUS Portfolio Exhibition
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            className="font-heading text-4xl font-bold leading-[1.08] text-slate-900 sm:text-5xl lg:text-6xl"
          >
            Discover{" "}
            <span className="bg-gradient-to-r from-sky-500 to-sky-600 bg-clip-text text-transparent">
              Verified Student Work
            </span>{" "}
            Across BINUS
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="mx-auto max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg lg:mx-0"
          >
            inkcuba is the official exhibition hall for BINUS academic
            portfolios — every published project is submitted through a lecturer
            workspace, reviewed with grades and feedback, then showcased with
            student, course, and faculty context.
          </motion.p>

          <motion.ul
            variants={fadeInUp}
            className="flex flex-wrap items-center justify-center gap-2 lg:justify-start"
          >
            {highlights.map((item) => (
              <li
                key={item.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm"
              >
                <item.icon className="h-3.5 w-3.5 text-sky-500" />
                {item.label}
              </li>
            ))}
          </motion.ul>

          <motion.div
            variants={fadeInUp}
            className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start"
          >
            <Button
              asChild
              size="lg"
              className="w-full bg-sky-500 shadow-inkcuba hover:bg-sky-600 hover:shadow-inkcuba-hover sm:w-auto"
            >
              <Link href="#showcase">
                Browse Exhibition
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full border-2 border-slate-900 sm:w-auto"
            >
              <Link href={siteConfig.links.signUp}>Join as Student / Lecturer</Link>
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative mx-auto flex w-full max-w-md items-center justify-center lg:max-w-none"
        >
          <div className="relative aspect-square w-full max-w-[22rem] sm:max-w-[26rem] lg:max-w-[28rem]">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-4 rounded-[2rem] border border-dashed border-sky-200/80"
            />
            <div className="absolute inset-0 rounded-[2rem] border-2 border-slate-900 bg-white shadow-inkcuba" />
            <div className="absolute inset-0 flex items-center justify-center p-10 sm:p-12">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative h-full w-full"
              >
                <Image
                  src="/images/inkcuba-logo.png"
                  alt="inkcuba isometric cube logo"
                  fill
                  sizes="(max-width: 768px) 80vw, 28rem"
                  className="object-contain"
                  priority
                />
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="absolute -right-2 top-8 hidden rounded-xl border-2 border-slate-900 bg-purple-50 px-4 py-3 shadow-inkcuba sm:block"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">
                Published
              </p>
              <p className="font-heading text-lg font-bold text-slate-900">
                120+ Projects
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className="absolute -left-2 bottom-10 hidden rounded-xl border-2 border-slate-900 bg-orange-50 px-4 py-3 shadow-inkcuba sm:block"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">
                Reviewed by
              </p>
              <p className="font-heading text-lg font-bold text-slate-900">
                BINUS Faculty
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
