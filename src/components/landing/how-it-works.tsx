"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Search, Upload } from "lucide-react";

import { fadeInUp, staggerContainer } from "@/lib/animations";

const steps = [
  {
    icon: Upload,
    title: "Submit in workspace",
    description: "Students upload rich portfolio data into lecturer-managed assignments.",
  },
  {
    icon: CheckCircle2,
    title: "Faculty verifies",
    description: "Lecturers grade, give feedback, and publish work that meets standards.",
  },
  {
    icon: Search,
    title: "Public explores",
    description: "Visitors discover verified projects through filters and public profiles.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="bg-slate-900 py-14 text-white sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="space-y-10"
        >
          <motion.div variants={fadeInUp} className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
              How inkcuba works
            </p>
            <h2 className="font-heading mt-3 text-2xl font-bold sm:text-3xl">
              From classroom workspace to public exhibition
            </h2>
          </motion.div>

          <div className="relative">
            <div
              aria-hidden
              className="absolute left-0 right-0 top-8 hidden h-0.5 bg-gradient-to-r from-transparent via-sky-500/50 to-transparent md:block"
            />

            <motion.div
              variants={staggerContainer}
              className="grid gap-6 md:grid-cols-3"
            >
              {steps.map((step, index) => (
                <motion.article
                  key={step.title}
                  variants={fadeInUp}
                  className="relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-sky-400/40 bg-sky-500/20 text-sm font-bold text-sky-300">
                      {index + 1}
                    </span>
                    <div className="rounded-lg border border-white/10 bg-white/10 p-2 text-sky-300">
                      <step.icon className="h-4 w-4" />
                    </div>
                  </div>
                  <h3 className="font-heading text-base font-semibold">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    {step.description}
                  </p>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
