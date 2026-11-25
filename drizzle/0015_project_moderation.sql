-- Lecturer moderation: portfolio history events + project email outbox.

DO $$ BEGIN
  CREATE TYPE "portfolio_event_actor_role" AS ENUM ('STUDENT', 'LECTURER', 'SYSTEM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "portfolio_event_type" AS ENUM (
    'CREATED',
    'SUBMITTED',
    'REVIEW_STARTED',
    'REVISION_REQUESTED',
    'RESUBMITTED',
    'PUBLISHED',
    'ARCHIVED',
    'DELETED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "project_email_template" AS ENUM (
    'PROJECT_SUBMITTED_STUDENT',
    'PROJECT_SUBMITTED_LECTURER',
    'PROJECT_REVISION_REQUESTED',
    'PROJECT_PUBLISHED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "project_email_outbox_status" AS ENUM ('PENDING', 'SENT', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "portfolio_event" (
  "id" text PRIMARY KEY NOT NULL,
  "portfolio_id" text NOT NULL,
  "actor_id" text,
  "actor_role" "portfolio_event_actor_role" NOT NULL,
  "event_type" "portfolio_event_type" NOT NULL,
  "from_status" "portfolio_status",
  "to_status" "portfolio_status",
  "grade" integer,
  "feedback" text,
  "message" text NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "portfolio_event"
    ADD CONSTRAINT "portfolio_event_portfolio_id_portfolio_id_fk"
    FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolio"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "portfolio_event"
    ADD CONSTRAINT "portfolio_event_actor_id_user_id_fk"
    FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "portfolio_event_portfolio_id_idx" ON "portfolio_event" ("portfolio_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portfolio_event_created_at_idx" ON "portfolio_event" ("portfolio_id", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portfolio_event_type_idx" ON "portfolio_event" ("event_type");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "project_email_outbox" (
  "id" text PRIMARY KEY NOT NULL,
  "portfolio_id" text,
  "workspace_id" text,
  "recipient" text NOT NULL,
  "template" "project_email_template" NOT NULL,
  "status" "project_email_outbox_status" DEFAULT 'PENDING' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "last_error" text,
  "payload" jsonb,
  "sent_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "project_email_outbox"
    ADD CONSTRAINT "project_email_outbox_portfolio_id_portfolio_id_fk"
    FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolio"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "project_email_outbox"
    ADD CONSTRAINT "project_email_outbox_workspace_id_workspace_id_fk"
    FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "project_email_outbox_status_idx" ON "project_email_outbox" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_email_outbox_portfolio_id_idx" ON "project_email_outbox" ("portfolio_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portfolio_workspace_status_idx" ON "portfolio" ("workspace_id", "status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portfolio_assignment_status_idx" ON "portfolio" ("assignment_id", "status");
