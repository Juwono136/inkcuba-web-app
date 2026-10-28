-- Submission slots on the existing assignment tables.
-- due_date stays unused; windows use opens_at / closes_at.

DO $$ BEGIN
  CREATE TYPE "assignment_status" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "assignment_schedule_mode" AS ENUM ('OPEN', 'WINDOW');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

ALTER TABLE "assignment" ADD COLUMN IF NOT EXISTS "max_score" integer;--> statement-breakpoint
ALTER TABLE "assignment" ADD COLUMN IF NOT EXISTS "schedule_mode" "assignment_schedule_mode";--> statement-breakpoint
ALTER TABLE "assignment" ADD COLUMN IF NOT EXISTS "opens_at" timestamp;--> statement-breakpoint
ALTER TABLE "assignment" ADD COLUMN IF NOT EXISTS "closes_at" timestamp;--> statement-breakpoint
ALTER TABLE "assignment" ADD COLUMN IF NOT EXISTS "status" "assignment_status";--> statement-breakpoint

UPDATE "assignment"
SET
  "max_score" = COALESCE("max_score", 100),
  "schedule_mode" = COALESCE("schedule_mode", 'OPEN'),
  "status" = COALESCE(
    "status",
    CASE WHEN "is_published" THEN 'ACTIVE'::"assignment_status" ELSE 'DRAFT'::"assignment_status" END
  );--> statement-breakpoint

ALTER TABLE "assignment" ALTER COLUMN "max_score" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "assignment" ALTER COLUMN "schedule_mode" SET DEFAULT 'OPEN';--> statement-breakpoint
ALTER TABLE "assignment" ALTER COLUMN "schedule_mode" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "assignment" ALTER COLUMN "status" SET DEFAULT 'DRAFT';--> statement-breakpoint
ALTER TABLE "assignment" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "assignment_workspace_status_idx"
  ON "assignment" ("workspace_id", "status");--> statement-breakpoint

ALTER TABLE "assignment_group_member" ADD COLUMN IF NOT EXISTS "assignment_id" text;--> statement-breakpoint

UPDATE "assignment_group_member" AS member
SET "assignment_id" = grp."assignment_id"
FROM "assignment_group" AS grp
WHERE member."group_id" = grp."id"
  AND member."assignment_id" IS NULL;--> statement-breakpoint

DELETE FROM "assignment_group_member" WHERE "assignment_id" IS NULL;--> statement-breakpoint

ALTER TABLE "assignment_group_member" ALTER COLUMN "assignment_id" SET NOT NULL;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "assignment_group_member"
    ADD CONSTRAINT "assignment_group_member_assignment_id_assignment_id_fk"
    FOREIGN KEY ("assignment_id") REFERENCES "assignment"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "assignment_group_member_assignment_user_idx"
  ON "assignment_group_member" ("assignment_id", "user_id");
