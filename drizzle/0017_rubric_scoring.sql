DO $$ BEGIN
  CREATE TYPE "portfolio_score_decision" AS ENUM ('PUBLISH', 'REVISION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "portfolio_scoring_mode" AS ENUM ('INDIVIDUAL', 'GROUP_ONLY', 'GROUP_AND_INDIVIDUAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assignment_rubric_component" (
  "id" text PRIMARY KEY NOT NULL,
  "assignment_id" text NOT NULL REFERENCES "assignment"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "description" text,
  "weight_percent" integer NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assignment_rubric_component_assignment_id_idx"
  ON "assignment_rubric_component" ("assignment_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assignment_rubric_component_sort_idx"
  ON "assignment_rubric_component" ("assignment_id", "sort_order");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolio_score_sheet" (
  "id" text PRIMARY KEY NOT NULL,
  "portfolio_id" text NOT NULL REFERENCES "portfolio"("id") ON DELETE cascade,
  "assignment_id" text NOT NULL REFERENCES "assignment"("id") ON DELETE cascade,
  "decision" "portfolio_score_decision" NOT NULL,
  "scoring_mode" "portfolio_scoring_mode" NOT NULL,
  "group_percent" integer DEFAULT 100 NOT NULL,
  "individual_percent" integer DEFAULT 0 NOT NULL,
  "group_total" integer NOT NULL,
  "final_grade" integer,
  "group_feedback" text,
  "created_by_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portfolio_score_sheet_portfolio_id_idx"
  ON "portfolio_score_sheet" ("portfolio_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portfolio_score_sheet_assignment_id_idx"
  ON "portfolio_score_sheet" ("assignment_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portfolio_score_sheet_created_at_idx"
  ON "portfolio_score_sheet" ("portfolio_id", "created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolio_score_component" (
  "id" text PRIMARY KEY NOT NULL,
  "sheet_id" text NOT NULL REFERENCES "portfolio_score_sheet"("id") ON DELETE cascade,
  "rubric_component_id" text NOT NULL,
  "score" integer NOT NULL,
  "max_points" integer NOT NULL,
  "weight_percent" integer NOT NULL,
  "component_name" text NOT NULL,
  "component_description" text
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "portfolio_score_component"
    ADD CONSTRAINT "portfolio_score_comp_rubric_fk"
    FOREIGN KEY ("rubric_component_id")
    REFERENCES "assignment_rubric_component"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portfolio_score_component_sheet_id_idx"
  ON "portfolio_score_component" ("sheet_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "portfolio_score_component_sheet_rubric_uidx"
  ON "portfolio_score_component" ("sheet_id", "rubric_component_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portfolio_member_score" (
  "id" text PRIMARY KEY NOT NULL,
  "sheet_id" text NOT NULL REFERENCES "portfolio_score_sheet"("id") ON DELETE cascade,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "individual_score" integer,
  "final_grade" integer NOT NULL,
  "notes" text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portfolio_member_score_sheet_id_idx"
  ON "portfolio_member_score" ("sheet_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "portfolio_member_score_sheet_user_uidx"
  ON "portfolio_member_score" ("sheet_id", "user_id");
