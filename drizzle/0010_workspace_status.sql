CREATE TYPE "public"."workspace_status" AS ENUM('DRAFT', 'ACTIVE', 'INACTIVE');--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "status" "workspace_status" DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
UPDATE "workspace" SET "status" = CASE WHEN "is_active" = true THEN 'ACTIVE'::"workspace_status" ELSE 'INACTIVE'::"workspace_status" END;--> statement-breakpoint
ALTER TABLE "workspace" ALTER COLUMN "status" SET DEFAULT 'DRAFT';--> statement-breakpoint
ALTER TABLE "workspace" DROP COLUMN "is_active";--> statement-breakpoint
CREATE INDEX "workspace_status_idx" ON "workspace" USING btree ("status");
