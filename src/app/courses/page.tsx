import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { showcaseCourses } from "@/data/showcase-courses";

export default function CoursesPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-2">
          <h1 className="font-heading text-3xl font-bold text-slate-900">Courses</h1>
          <p className="text-slate-600">
            Active BINUS workspaces currently exhibiting verified student portfolios.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {showcaseCourses.map((course) => (
            <article
              key={course.id}
              className="rounded-2xl border-2 border-slate-900 bg-white p-5 shadow-inkcuba"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
                {course.courseCode}
              </p>
              <h2 className="font-heading mt-1 text-xl font-semibold text-slate-900">
                {course.courseName}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {course.className} · {course.semester} · {course.lecturerName}
              </p>
              <p className="mt-3 text-sm text-slate-500">
                {course.portfolioCount} portfolios · {course.studentCount} students
              </p>
            </article>
          ))}
        </div>

        <div className="mt-8">
          <Button asChild variant="outline" className="border-2 border-slate-900">
            <Link href="/#showcase">Browse portfolios</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
