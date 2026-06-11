"use client";

import { motion } from "framer-motion";
import { BookOpen, Shield, Users } from "lucide-react";

import { fadeInUp, staggerContainer } from "@/lib/animations";

const pillars = [
  {
    icon: Shield,
    title: "Academic integrity",
    description:
      "Only portfolios approved by course lecturers appear in the public exhibition.",
    offset: "lg:translate-y-0",
  },
  {
    icon: Users,
    title: "Connected profiles",
    description:
      "Every project links to its student authors, verifying lecturer, course, and workspace.",
    offset: "lg:translate-y-6",
  },
  {
    icon: BookOpen,
    title: "Built for discovery",
    description:
      "Visitors can explore by program, technology, course, batch, and project type.",
    offset: "lg:translate-y-12",
  },
];

export function AboutSection() {
  return (
    <section className="relative overflow-hidden border-y border-slate-200 bg-white py-14 sm:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 top-10 h-64 w-64 rounded-full bg-sky-100/50 blur-3xl"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid gap-10 lg:grid-cols-2 lg:items-center"
        >
          <motion.div variants={fadeInUp} className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-500">
              About inkcuba
            </p>
            <h2 className="font-heading text-3xl font-bold text-slate-900 sm:text-4xl">
              A university exhibition for credible student portfolios
            </h2>
            <p className="text-base leading-relaxed text-slate-600">
              inkcuba combines classroom workspaces, assignment workflows, and
              faculty moderation into one public showcase. It helps students build
              recruiter-ready credentials while giving lecturers a structured way
              to verify academic output across BINUS programs.
            </p>
            <div className="inline-flex rounded-xl border-2 border-slate-900 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Trusted by students, lecturers, and public visitors across BINUS.
            </div>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 lg:gap-5"
          >
            {pillars.map((pillar) => (
              <motion.article
                key={pillar.title}
                variants={fadeInUp}
                className={`rounded-2xl border-2 border-slate-900 bg-white p-5 shadow-inkcuba transition-transform duration-200 hover:-translate-y-1 hover:shadow-none ${pillar.offset}`}
              >
                <pillar.icon className="mb-3 h-5 w-5 text-sky-500" />
                <h3 className="font-heading text-sm font-semibold text-slate-900">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {pillar.description}
                </p>
              </motion.article>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
