ALTER TABLE "user" ADD COLUMN "campus" text;--> statement-breakpoint
CREATE INDEX "user_campus_idx" ON "user" USING btree ("campus");