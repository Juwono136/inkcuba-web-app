-- Align roles with PRD: Student, Lecturer, Admin only (remove SUPER_ADMIN)
UPDATE "user" SET "role" = 'ADMIN' WHERE "role" = 'SUPER_ADMIN';--> statement-breakpoint
ALTER TYPE "public"."user_role" RENAME TO "user_role_old";--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('STUDENT', 'LECTURER', 'ADMIN');--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" TYPE "public"."user_role" USING "role"::text::"public"."user_role";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'STUDENT'::"public"."user_role";--> statement-breakpoint
DROP TYPE "public"."user_role_old";
