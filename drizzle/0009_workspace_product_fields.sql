ALTER TABLE "workspace" ADD COLUMN "name" text;--> statement-breakpoint
UPDATE "workspace" SET "name" = COALESCE("course_name", 'Untitled workspace') WHERE "name" IS NULL;--> statement-breakpoint
ALTER TABLE "workspace" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "background_image_key" text;--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "background_image_url" text;--> statement-breakpoint
DROP INDEX IF EXISTS "workspace_unique_class_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "workspace_course_code_idx";--> statement-breakpoint
ALTER TABLE "workspace" DROP COLUMN IF EXISTS "course_code";--> statement-breakpoint
ALTER TABLE "workspace" DROP COLUMN IF EXISTS "course_name";--> statement-breakpoint
ALTER TABLE "workspace" DROP COLUMN IF EXISTS "academic_year";--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_unique_class_idx" ON "workspace" USING btree ("lecturer_id","name","class_name","semester");
