-- Fix truncated FK name (>63 chars) that caused drizzle-kit push rename loops.
DO $$ BEGIN
  ALTER TABLE "portfolio_score_component"
    DROP CONSTRAINT IF EXISTS "portfolio_score_component_rubric_component_id_assignment_rubric";
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "portfolio_score_component"
    DROP CONSTRAINT IF EXISTS "portfolio_score_component_rubric_component_id_assignment_rubric_component_id_fk";
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "portfolio_score_component"
    ADD CONSTRAINT "portfolio_score_comp_rubric_fk"
    FOREIGN KEY ("rubric_component_id")
    REFERENCES "public"."assignment_rubric_component"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
