"use client";

import { motion } from "framer-motion";
import { ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { showcaseCourses } from "@/data/showcase-courses";
import { siteConfig } from "@/config/site";
import { fadeInUp, staggerContainer } from "@/lib/animations";

export function CoursesPreviewSection() {
  return (
    <section className="py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="space-y-8"
        >
          <motion.div
            variants={fadeInUp}
            className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
          >
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-500">
                Active workspaces
              </p>
              <h2 className="font-heading text-3xl font-bold text-slate-900">
                Courses currently exhibiting portfolios
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                Each workspace represents a BINUS class where students submit
                assignments and lecturers verify outcomes before publication.
              </p>
            </div>
            <Button asChild variant="outline" className="w-fit border-2 border-slate-900">
              <Link href={siteConfig.links.courses}>
                View all courses
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>

          <motion.div variants={fadeInUp} className="-mx-4 sm:mx-0">
            <div className="flex gap-4 overflow-x-auto px-4 pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:gap-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {showcaseCourses.map((course, index) => (
                <motion.article
                  key={course.id}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08, duration: 0.35 }}
                  className="w-[min(85vw,320px)] shrink-0 rounded-2xl border-2 border-slate-900 bg-white p-5 shadow-inkcuba transition-transform duration-200 hover:-translate-y-1 hover:shadow-none sm:w-auto"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
                        {course.courseCode}
                      </p>
                      <h3 className="font-heading mt-1 text-lg font-semibold text-slate-900">
                        {course.courseName}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {course.className} · {course.semester}
                      </p>
                    </div>
                    <BookOpen className="h-5 w-5 shrink-0 text-slate-400" />
                  </div>
                  <div className="mt-4 space-y-1 text-sm text-slate-600">
                    <p>{course.portfolioCount} published portfolios</p>
                    <p>{course.studentCount} students enrolled</p>
                    <p className="text-slate-500">Lecturer: {course.lecturerName}</p>
                  </div>
                </motion.article>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
