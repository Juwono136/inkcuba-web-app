ALTER TABLE "user" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
CREATE INDEX "user_deleted_at_idx" ON "user" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "user_is_active_idx" ON "user" USING btree ("is_active");