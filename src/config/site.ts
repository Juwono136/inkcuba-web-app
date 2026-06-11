import { clientEnv } from "@/config/env-client";

export const siteConfig = {
  name: "inkcuba",
  title: "inkcuba — Verified Academic Portfolio Platform",
  description:
    "A verified academic portfolio and project showcase platform for BINUS University students and lecturers.",
  url: clientEnv.NEXT_PUBLIC_SITE_URL,
  appUrl: clientEnv.NEXT_PUBLIC_APP_URL,
  allowedStudentEmailDomain: "binus.edu",
  allowedLecturerEmailDomain: "binus.ac.id",
  links: {
    explore: "/explore",
    courses: "/courses",
    stats: "/stats",
    signIn: "/auth/sign-in",
    signUp: "/auth/sign-up",
  },
} as const;
