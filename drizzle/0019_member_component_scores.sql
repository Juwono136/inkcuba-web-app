-- Per-member rubric component scores for GROUP_AND_INDIVIDUAL publishing.
CREATE TABLE IF NOT EXISTS "portfolio_member_component_score" (
  "id" text PRIMARY KEY NOT NULL,
  "sheet_id" text NOT NULL,
  "user_id" text NOT NULL,
  "rubric_component_id" text NOT NULL,
  "score" integer NOT NULL,
  "max_points" integer NOT NULL,
  "weight_percent" integer NOT NULL,
  "component_name" text NOT NULL,
  "component_description" text,
  CONSTRAINT "portfolio_member_comp_sheet_fk"
    FOREIGN KEY ("sheet_id") REFERENCES "portfolio_score_sheet"("id") ON DELETE cascade,
  CONSTRAINT "portfolio_member_comp_user_fk"
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade,
  CONSTRAINT "portfolio_member_comp_rubric_fk"
    FOREIGN KEY ("rubric_component_id") REFERENCES "assignment_rubric_component"("id") ON DELETE restrict
);

CREATE INDEX IF NOT EXISTS "portfolio_member_comp_sheet_idx"
  ON "portfolio_member_component_score" ("sheet_id");
CREATE INDEX IF NOT EXISTS "portfolio_member_comp_user_idx"
  ON "portfolio_member_component_score" ("sheet_id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "portfolio_member_comp_uidx"
  ON "portfolio_member_component_score" ("sheet_id", "user_id", "rubric_component_id");
