"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

import { BrandLogo } from "@/components/layout/brand-logo";
import { fadeInUp, staggerContainer } from "@/lib/animations";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-2">
        {/* Brand panel */}
        <div className="relative hidden overflow-hidden border-r border-slate-200 bg-gradient-to-br from-sky-50 via-white to-purple-50 p-10 lg:flex lg:flex-col lg:justify-between">
          <Link href="/">
            <BrandLogo size="md" />
          </Link>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            <motion.div variants={fadeInUp} className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-500">
                inkcuba Platform
              </p>
              <h1 className="font-heading text-4xl font-bold leading-tight text-slate-900">
                Verified academic portfolios for BINUS
              </h1>
              <p className="max-w-md text-base leading-relaxed text-slate-600">
                Join the official exhibition platform where student work is
                submitted, reviewed by faculty, and showcased with academic
                credibility.
              </p>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="relative mx-auto aspect-square w-full max-w-xs"
            >
              <div className="absolute inset-0 rounded-3xl border-2 border-slate-900 bg-white shadow-inkcuba" />
              <div className="absolute inset-0 flex items-center justify-center p-10">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="relative h-full w-full"
                >
                  <Image
                    src="/images/inkcuba-logo.png"
                    alt="inkcuba"
                    fill
                    sizes="(max-width: 1024px) 60vw, 20rem"
                    className="object-contain"
                    priority
                  />
                </motion.div>
              </div>
            </motion.div>
          </motion.div>

          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} inkcuba · BINUS University
          </p>
        </div>

        {/* Form panel */}
        <div className="flex flex-col justify-center px-4 py-10 sm:px-8 lg:px-12">
          <div className="mb-8 lg:hidden">
            <Link href="/">
              <BrandLogo size="sm" />
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="mx-auto w-full max-w-md space-y-8"
          >
            <div className="space-y-2">
              <h2 className="font-heading text-3xl font-bold text-slate-900">
                {title}
              </h2>
              <p className="text-sm leading-relaxed text-slate-600">{subtitle}</p>
            </div>

            {children}

            {footer ? (
              <div className="border-t border-slate-100 pt-6 text-center text-sm text-slate-600">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
