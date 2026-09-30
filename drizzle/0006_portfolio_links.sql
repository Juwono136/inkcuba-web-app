-- Migrate legacy portfolio_urls (text[]) → portfolio_links (jsonb {label,url}[])
ALTER TABLE "student_profile" ADD COLUMN "portfolio_links" jsonb;--> statement-breakpoint
UPDATE "student_profile"
SET "portfolio_links" = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'label', 'Link ' || ordinality::text,
        'url', u
      )
      ORDER BY ordinality
    )
    FROM unnest("portfolio_urls") WITH ORDINALITY AS t(u, ordinality)
  ),
  '[]'::jsonb
);--> statement-breakpoint
ALTER TABLE "student_profile" DROP COLUMN "portfolio_urls";--> statement-breakpoint

ALTER TABLE "lecturer_profile" ADD COLUMN "portfolio_links" jsonb;--> statement-breakpoint
UPDATE "lecturer_profile"
SET "portfolio_links" = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'label', 'Link ' || ordinality::text,
        'url', u
      )
      ORDER BY ordinality
    )
    FROM unnest("portfolio_urls") WITH ORDINALITY AS t(u, ordinality)
  ),
  '[]'::jsonb
);--> statement-breakpoint
ALTER TABLE "lecturer_profile" DROP COLUMN "portfolio_urls";
