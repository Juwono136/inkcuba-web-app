"use client";

import { motion } from "framer-motion";

import { inkcubaTeam } from "@/data/team";
import { fadeInUp, staggerContainer } from "@/lib/animations";

export function TeamSection() {
  return (
    <section className="border-t border-slate-200 bg-slate-50 py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="space-y-8"
        >
          <motion.div variants={fadeInUp} className="max-w-2xl space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-500">
              People behind inkcuba
            </p>
            <h2 className="font-heading text-3xl font-bold text-slate-900">
              Built with faculty and student collaboration
            </h2>
            <p className="text-base leading-relaxed text-slate-600">
              inkcuba is developed as a cross-program initiative at BINUS
              University, combining academic governance, platform engineering,
              and student-centered design.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            className="grid gap-4 md:grid-cols-3"
          >
            {inkcubaTeam.map((member, index) => (
              <motion.article
                key={member.id}
                variants={fadeInUp}
                className="rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-inkcuba transition-transform duration-200 hover:-translate-y-1 hover:shadow-none"
                style={{ marginTop: index === 1 ? undefined : 0 }}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">
                  {member.role}
                </p>
                <h3 className="font-heading mt-2 text-lg font-semibold text-slate-900">
                  {member.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {member.department}
                </p>
              </motion.article>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
