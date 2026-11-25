-- Fix truncated auto FK names on portfolio_member_component_score that cause
-- drizzle-kit push rename loops (Postgres 63-char identifier limit).
DO $$ BEGIN
  ALTER TABLE "portfolio_member_component_score"
    DROP CONSTRAINT IF EXISTS "portfolio_member_component_score_sheet_id_portfolio_score_sheet";
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "portfolio_member_component_score"
    DROP CONSTRAINT IF EXISTS "portfolio_member_component_score_sheet_id_portfolio_score_sheet_id_fk";
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "portfolio_member_component_score"
    DROP CONSTRAINT IF EXISTS "portfolio_member_component_score_user_id_user_id_fk";
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "portfolio_member_component_score"
    DROP CONSTRAINT IF EXISTS "portfolio_member_component_score_user_id_user";
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "portfolio_member_component_score"
    ADD CONSTRAINT "portfolio_member_comp_sheet_fk"
    FOREIGN KEY ("sheet_id")
    REFERENCES "public"."portfolio_score_sheet"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "portfolio_member_component_score"
    ADD CONSTRAINT "portfolio_member_comp_user_fk"
    FOREIGN KEY ("user_id")
    REFERENCES "public"."user"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "portfolio_member_component_score"
    ADD CONSTRAINT "portfolio_member_comp_rubric_fk"
    FOREIGN KEY ("rubric_component_id")
    REFERENCES "public"."assignment_rubric_component"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
