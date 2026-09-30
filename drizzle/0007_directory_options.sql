CREATE TYPE "public"."directory_option_category" AS ENUM('campus', 'major', 'batch', 'semester', 'department');--> statement-breakpoint
CREATE TABLE "directory_option" (
	"id" text PRIMARY KEY NOT NULL,
	"category" "directory_option_category" NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "directory_option_category_value_uidx" ON "directory_option" USING btree ("category","value");--> statement-breakpoint
CREATE INDEX "directory_option_category_idx" ON "directory_option" USING btree ("category");--> statement-breakpoint
CREATE INDEX "directory_option_active_idx" ON "directory_option" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "directory_option_sort_idx" ON "directory_option" USING btree ("category","sort_order");--> statement-breakpoint
ALTER TABLE "student_profile" ADD COLUMN "department" text;--> statement-breakpoint
ALTER TABLE "student_profile" ADD COLUMN "title" text;
