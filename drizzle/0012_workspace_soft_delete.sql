-- Soft-delete trash for workspaces (30-day retention before hard purge).
-- Trash is tracked by deleted_at — separate from lifecycle status DRAFT/ACTIVE/INACTIVE.

ALTER TABLE "workspace" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "workspace_deleted_at_idx" ON "workspace" ("deleted_at");--> statement-breakpoint

-- Allow recreating the same class while a soft-deleted copy is in trash.
DROP INDEX IF EXISTS "workspace_unique_class_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_unique_class_idx" ON "workspace" ("lecturer_id", "name", "class_name", "semester") WHERE "deleted_at" IS NULL;--> statement-breakpoint

-- Welcome email when a student joins via invite link/code.
ALTER TYPE "workspace_email_template" ADD VALUE IF NOT EXISTS 'WORKSPACE_JOINED';
