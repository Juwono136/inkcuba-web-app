ALTER TABLE "lecturer_profile" ADD COLUMN "major" text;--> statement-breakpoint
ALTER TABLE "lecturer_profile" ADD COLUMN "skills" text[];--> statement-breakpoint
ALTER TABLE "lecturer_profile" ADD COLUMN "github_url" text;--> statement-breakpoint
ALTER TABLE "lecturer_profile" ADD COLUMN "instagram_url" text;--> statement-breakpoint
ALTER TABLE "lecturer_profile" ADD COLUMN "youtube_url" text;--> statement-breakpoint
ALTER TABLE "lecturer_profile" ADD COLUMN "twitter_url" text;--> statement-breakpoint
ALTER TABLE "lecturer_profile" ADD COLUMN "tiktok_url" text;--> statement-breakpoint
ALTER TABLE "lecturer_profile" ADD COLUMN "portfolio_urls" text[];--> statement-breakpoint
ALTER TABLE "student_profile" ADD COLUMN "is_alumni" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profile" ADD COLUMN "instagram_url" text;--> statement-breakpoint
ALTER TABLE "student_profile" ADD COLUMN "youtube_url" text;--> statement-breakpoint
ALTER TABLE "student_profile" ADD COLUMN "twitter_url" text;--> statement-breakpoint
ALTER TABLE "student_profile" ADD COLUMN "tiktok_url" text;--> statement-breakpoint
ALTER TABLE "student_profile" ADD COLUMN "portfolio_urls" text[];
