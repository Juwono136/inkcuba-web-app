-- Student project lifecycle. Portfolios survive workspace and submission deletion.

ALTER TYPE "portfolio_status" ADD VALUE IF NOT EXISTS 'SUBMITTED';--> statement-breakpoint
ALTER TYPE "portfolio_status" ADD VALUE IF NOT EXISTS 'IN_REVIEW';--> statement-breakpoint
ALTER TYPE "portfolio_status" ADD VALUE IF NOT EXISTS 'NEED_REVISION';--> statement-breakpoint
ALTER TYPE "portfolio_status" ADD VALUE IF NOT EXISTS 'REVISED';--> statement-breakpoint
ALTER TYPE "portfolio_status" ADD VALUE IF NOT EXISTS 'PUBLISHED';--> statement-breakpoint
ALTER TYPE "portfolio_status" ADD VALUE IF NOT EXISTS 'TAKEN_DOWN';--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "portfolio_document_role" AS ENUM ('PROJECT', 'ADDITIONAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

ALTER TABLE "portfolio" ADD COLUMN IF NOT EXISTS "demo_url" text;--> statement-breakpoint
ALTER TABLE "portfolio" ADD COLUMN IF NOT EXISTS "video_url" text;--> statement-breakpoint
ALTER TABLE "portfolio" ADD COLUMN IF NOT EXISTS "source_url" text;--> statement-breakpoint
ALTER TABLE "portfolio" ADD COLUMN IF NOT EXISTS "workspace_name" text;--> statement-breakpoint
ALTER TABLE "portfolio" ADD COLUMN IF NOT EXISTS "class_name" text;--> statement-breakpoint
ALTER TABLE "portfolio" ADD COLUMN IF NOT EXISTS "semester_label" text;--> statement-breakpoint
ALTER TABLE "portfolio" ADD COLUMN IF NOT EXISTS "submission_title" text;--> statement-breakpoint
ALTER TABLE "portfolio" ADD COLUMN IF NOT EXISTS "lecturer_name" text;--> statement-breakpoint
ALTER TABLE "portfolio" ADD COLUMN IF NOT EXISTS "campus" text;--> statement-breakpoint
ALTER TABLE "portfolio" ADD COLUMN IF NOT EXISTS "major" text;--> statement-breakpoint
ALTER TABLE "portfolio" ADD COLUMN IF NOT EXISTS "batch" text;--> statement-breakpoint
ALTER TABLE "portfolio" ADD COLUMN IF NOT EXISTS "academic_semester" text;--> statement-breakpoint

ALTER TABLE "portfolio" DROP CONSTRAINT IF EXISTS "portfolio_workspace_id_workspace_id_fk";--> statement-breakpoint
ALTER TABLE "portfolio" DROP CONSTRAINT IF EXISTS "portfolio_assignment_id_assignment_id_fk";--> statement-breakpoint
ALTER TABLE "portfolio" ALTER COLUMN "workspace_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "portfolio" ALTER COLUMN "assignment_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "portfolio" ADD CONSTRAINT "portfolio_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio" ADD CONSTRAINT "portfolio_assignment_id_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "portfolio_document" ADD COLUMN IF NOT EXISTS "role" "portfolio_document_role" DEFAULT 'ADDITIONAL';--> statement-breakpoint
UPDATE "portfolio_document" SET "role" = 'ADDITIONAL' WHERE "role" IS NULL;--> statement-breakpoint
ALTER TABLE "portfolio_document" ALTER COLUMN "role" SET NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portfolio_document_role_idx" ON "portfolio_document" ("portfolio_id", "role");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "portfolio_video" (
  "id" text PRIMARY KEY NOT NULL,
  "portfolio_id" text NOT NULL UNIQUE,
  "storage_key" text NOT NULL,
  "url" text NOT NULL,
  "mime_type" text NOT NULL,
  "size" integer NOT NULL,
  "duration_seconds" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "portfolio_video_portfolio_id_portfolio_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolio"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portfolio_video_portfolio_id_idx" ON "portfolio_video" ("portfolio_id");--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "portfolio_individual_uidx" ON "portfolio" ("assignment_id", "submitted_by_id") WHERE "group_id" IS NULL AND "assignment_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "portfolio_group_uidx" ON "portfolio" ("assignment_id", "group_id") WHERE "group_id" IS NOT NULL AND "assignment_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "portfolio_contributor_uidx" ON "portfolio_contributor" ("portfolio_id", "user_id");--> statement-breakpoint
