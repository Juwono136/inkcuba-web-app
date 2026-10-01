CREATE TYPE "public"."settings_identity_field" AS ENUM('name', 'title', 'campus', 'nim', 'nidn', 'major', 'batch', 'semester', 'department');--> statement-breakpoint
CREATE TABLE "role_field_permission" (
	"id" text PRIMARY KEY NOT NULL,
	"role" "user_role" NOT NULL,
	"field" "settings_identity_field" NOT NULL,
	"editable_by_self" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "role_field_permission_role_field_uidx" ON "role_field_permission" USING btree ("role","field");--> statement-breakpoint
CREATE INDEX "role_field_permission_role_idx" ON "role_field_permission" USING btree ("role");
