import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "@/db/schema/auth";

export const studentProfile = pgTable(
  "student_profile",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    bio: text("bio"),
    major: text("major"),
    batch: text("batch"),
    semester: text("semester"),
    isAlumni: boolean("is_alumni").default(false).notNull(),
    skills: text("skills").array(),
    linkedinUrl: text("linkedin_url"),
    githubUrl: text("github_url"),
    instagramUrl: text("instagram_url"),
    youtubeUrl: text("youtube_url"),
    twitterUrl: text("twitter_url"),
    tiktokUrl: text("tiktok_url"),
    /** Custom named links (max 4) — replaces legacy portfolio_urls text[]. */
    portfolioLinks: jsonb("portfolio_links").$type<
      { label: string; url: string }[]
    >(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("student_profile_user_id_idx").on(table.userId),
    index("student_profile_major_idx").on(table.major),
    index("student_profile_batch_idx").on(table.batch),
  ],
);

export const lecturerProfile = pgTable(
  "lecturer_profile",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    bio: text("bio"),
    major: text("major"),
    department: text("department"),
    title: text("title"),
    skills: text("skills").array(),
    linkedinUrl: text("linkedin_url"),
    githubUrl: text("github_url"),
    instagramUrl: text("instagram_url"),
    youtubeUrl: text("youtube_url"),
    twitterUrl: text("twitter_url"),
    tiktokUrl: text("tiktok_url"),
    /** Custom named links (max 4) — replaces legacy portfolio_urls text[]. */
    portfolioLinks: jsonb("portfolio_links").$type<
      { label: string; url: string }[]
    >(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("lecturer_profile_user_id_idx").on(table.userId),
    index("lecturer_profile_department_idx").on(table.department),
  ],
);
