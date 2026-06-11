CREATE TYPE "public"."assignment_type" AS ENUM('INDIVIDUAL', 'GROUP');--> statement-breakpoint
CREATE TYPE "public"."group_assignment_method" AS ENUM('RANDOM', 'MANUAL', 'SELF_SELECT');--> statement-breakpoint
CREATE TYPE "public"."portfolio_status" AS ENUM('DRAFT', 'PENDING_REVIEW', 'REVISION_REQUIRED', 'APPROVED', 'TAKEDOWN', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('STUDENT', 'LECTURER', 'ADMIN', 'SUPER_ADMIN');--> statement-breakpoint
CREATE TYPE "public"."workspace_member_status" AS ENUM('INVITED', 'ACTIVE', 'REMOVED');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'STUDENT' NOT NULL,
	"nim" text,
	"nidn" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lecturer_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"bio" text,
	"department" text,
	"title" text,
	"linkedin_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lecturer_profile_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "student_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"bio" text,
	"major" text,
	"batch" text,
	"semester" text,
	"skills" text[],
	"linkedin_url" text,
	"github_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "student_profile_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "assignment" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "assignment_type" DEFAULT 'INDIVIDUAL' NOT NULL,
	"group_method" "group_assignment_method",
	"max_group_size" integer,
	"due_date" timestamp,
	"is_published" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignment_group" (
	"id" text PRIMARY KEY NOT NULL,
	"assignment_id" text NOT NULL,
	"name" text NOT NULL,
	"invite_code" text,
	"max_members" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assignment_group_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "assignment_group_member" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"user_id" text NOT NULL,
	"is_leader" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace" (
	"id" text PRIMARY KEY NOT NULL,
	"lecturer_id" text NOT NULL,
	"course_code" text NOT NULL,
	"course_name" text NOT NULL,
	"class_name" text NOT NULL,
	"semester" text NOT NULL,
	"academic_year" text NOT NULL,
	"description" text,
	"invite_code" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "workspace_member" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" "workspace_member_status" DEFAULT 'INVITED' NOT NULL,
	"joined_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"assignment_id" text NOT NULL,
	"submitted_by_id" text NOT NULL,
	"group_id" text,
	"title" text NOT NULL,
	"description" text,
	"status" "portfolio_status" DEFAULT 'DRAFT' NOT NULL,
	"grade" integer,
	"feedback" text,
	"verified_by_id" text,
	"verified_at" timestamp,
	"published_at" timestamp,
	"technology_tags" text[],
	"youtube_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_contributor" (
	"id" text PRIMARY KEY NOT NULL,
	"portfolio_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_document" (
	"id" text PRIMARY KEY NOT NULL,
	"portfolio_id" text NOT NULL,
	"storage_key" text NOT NULL,
	"url" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_image" (
	"id" text PRIMARY KEY NOT NULL,
	"portfolio_id" text NOT NULL,
	"storage_key" text NOT NULL,
	"url" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"is_poster" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_link" (
	"id" text PRIMARY KEY NOT NULL,
	"portfolio_id" text NOT NULL,
	"label" text,
	"url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"metadata" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lecturer_profile" ADD CONSTRAINT "lecturer_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profile" ADD CONSTRAINT "student_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_group" ADD CONSTRAINT "assignment_group_assignment_id_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_group_member" ADD CONSTRAINT "assignment_group_member_group_id_assignment_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."assignment_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_group_member" ADD CONSTRAINT "assignment_group_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_lecturer_id_user_id_fk" FOREIGN KEY ("lecturer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio" ADD CONSTRAINT "portfolio_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio" ADD CONSTRAINT "portfolio_assignment_id_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio" ADD CONSTRAINT "portfolio_submitted_by_id_user_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio" ADD CONSTRAINT "portfolio_group_id_assignment_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."assignment_group"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio" ADD CONSTRAINT "portfolio_verified_by_id_user_id_fk" FOREIGN KEY ("verified_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_contributor" ADD CONSTRAINT "portfolio_contributor_portfolio_id_portfolio_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolio"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_contributor" ADD CONSTRAINT "portfolio_contributor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_document" ADD CONSTRAINT "portfolio_document_portfolio_id_portfolio_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolio"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_image" ADD CONSTRAINT "portfolio_image_portfolio_id_portfolio_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolio"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_link" ADD CONSTRAINT "portfolio_link_portfolio_id_portfolio_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolio"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "account_provider_idx" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_token_idx" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "user" USING btree ("role");--> statement-breakpoint
CREATE INDEX "user_nim_idx" ON "user" USING btree ("nim");--> statement-breakpoint
CREATE INDEX "user_nidn_idx" ON "user" USING btree ("nidn");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "lecturer_profile_user_id_idx" ON "lecturer_profile" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lecturer_profile_department_idx" ON "lecturer_profile" USING btree ("department");--> statement-breakpoint
CREATE INDEX "student_profile_user_id_idx" ON "student_profile" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "student_profile_major_idx" ON "student_profile" USING btree ("major");--> statement-breakpoint
CREATE INDEX "student_profile_batch_idx" ON "student_profile" USING btree ("batch");--> statement-breakpoint
CREATE INDEX "assignment_workspace_id_idx" ON "assignment" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "assignment_due_date_idx" ON "assignment" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "assignment_group_assignment_id_idx" ON "assignment_group" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "assignment_group_member_group_id_idx" ON "assignment_group_member" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "assignment_group_member_user_id_idx" ON "assignment_group_member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assignment_group_member_unique_idx" ON "assignment_group_member" USING btree ("group_id","user_id");--> statement-breakpoint
CREATE INDEX "workspace_lecturer_id_idx" ON "workspace" USING btree ("lecturer_id");--> statement-breakpoint
CREATE INDEX "workspace_course_code_idx" ON "workspace" USING btree ("course_code");--> statement-breakpoint
CREATE INDEX "workspace_semester_idx" ON "workspace" USING btree ("semester");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_unique_class_idx" ON "workspace" USING btree ("course_code","class_name","semester","academic_year","lecturer_id");--> statement-breakpoint
CREATE INDEX "workspace_member_workspace_id_idx" ON "workspace_member" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_member_user_id_idx" ON "workspace_member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_member_unique_idx" ON "workspace_member" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "portfolio_workspace_id_idx" ON "portfolio" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "portfolio_assignment_id_idx" ON "portfolio" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "portfolio_submitted_by_id_idx" ON "portfolio" USING btree ("submitted_by_id");--> statement-breakpoint
CREATE INDEX "portfolio_status_idx" ON "portfolio" USING btree ("status");--> statement-breakpoint
CREATE INDEX "portfolio_verified_by_id_idx" ON "portfolio" USING btree ("verified_by_id");--> statement-breakpoint
CREATE INDEX "portfolio_contributor_portfolio_id_idx" ON "portfolio_contributor" USING btree ("portfolio_id");--> statement-breakpoint
CREATE INDEX "portfolio_contributor_user_id_idx" ON "portfolio_contributor" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "portfolio_document_portfolio_id_idx" ON "portfolio_document" USING btree ("portfolio_id");--> statement-breakpoint
CREATE INDEX "portfolio_image_portfolio_id_idx" ON "portfolio_image" USING btree ("portfolio_id");--> statement-breakpoint
CREATE INDEX "portfolio_link_portfolio_id_idx" ON "portfolio_link" USING btree ("portfolio_id");--> statement-breakpoint
CREATE INDEX "audit_log_actor_id_idx" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");