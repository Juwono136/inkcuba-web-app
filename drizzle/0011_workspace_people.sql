CREATE TYPE "public"."workspace_member_source" AS ENUM('MANUAL', 'EXCEL', 'LINK', 'CODE');--> statement-breakpoint
CREATE TYPE "public"."workspace_import_job_status" AS ENUM('UPLOADED', 'PARSING', 'READY', 'COMMITTING', 'COMPLETED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."workspace_import_item_status" AS ENUM('PENDING', 'SKIPPED', 'SUCCESS', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."workspace_invitation_purpose" AS ENUM('INVITE_EXISTING', 'INVITE_ACTIVATE');--> statement-breakpoint
CREATE TYPE "public"."workspace_email_outbox_status" AS ENUM('PENDING', 'SENT', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."workspace_email_template" AS ENUM('INVITE_EXISTING', 'INVITE_REGISTERED_NO_LOGIN', 'INVITE_ACTIVATE');--> statement-breakpoint
ALTER TABLE "workspace_member" ADD COLUMN "source" "workspace_member_source" DEFAULT 'MANUAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_member" ADD COLUMN "invited_by" text;--> statement-breakpoint
ALTER TABLE "workspace_member" ADD COLUMN "invited_at" timestamp;--> statement-breakpoint
ALTER TABLE "workspace_member" ADD COLUMN "removed_at" timestamp;--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_member_status_idx" ON "workspace_member" USING btree ("status");--> statement-breakpoint
CREATE TABLE "workspace_import_job" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"lecturer_id" text NOT NULL,
	"status" "workspace_import_job_status" DEFAULT 'UPLOADED' NOT NULL,
	"file_key" text,
	"file_name" text,
	"file_sha256" text,
	"row_count" integer DEFAULT 0 NOT NULL,
	"valid_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"processed_count" integer DEFAULT 0 NOT NULL,
	"idempotency_key" text,
	"metadata" jsonb,
	"committed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "workspace_import_job_item" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"row_index" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"validation" jsonb NOT NULL,
	"resolved_user_id" text,
	"status" "workspace_import_item_status" DEFAULT 'PENDING' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "workspace_invitation_token" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"member_id" text,
	"token_hash" text NOT NULL,
	"purpose" "workspace_invitation_purpose" NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "workspace_email_outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text,
	"member_id" text,
	"workspace_id" text NOT NULL,
	"recipient" text NOT NULL,
	"template" "workspace_email_template" NOT NULL,
	"status" "workspace_email_outbox_status" DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"payload" jsonb,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "workspace_import_job" ADD CONSTRAINT "workspace_import_job_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_import_job" ADD CONSTRAINT "workspace_import_job_lecturer_id_user_id_fk" FOREIGN KEY ("lecturer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_import_job_item" ADD CONSTRAINT "workspace_import_job_item_job_id_workspace_import_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."workspace_import_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_import_job_item" ADD CONSTRAINT "workspace_import_job_item_resolved_user_id_user_id_fk" FOREIGN KEY ("resolved_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invitation_token" ADD CONSTRAINT "workspace_invitation_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invitation_token" ADD CONSTRAINT "workspace_invitation_token_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invitation_token" ADD CONSTRAINT "workspace_invitation_token_member_id_workspace_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."workspace_member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_email_outbox" ADD CONSTRAINT "workspace_email_outbox_job_id_workspace_import_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."workspace_import_job"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_email_outbox" ADD CONSTRAINT "workspace_email_outbox_member_id_workspace_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."workspace_member"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_email_outbox" ADD CONSTRAINT "workspace_email_outbox_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_import_job_workspace_id_idx" ON "workspace_import_job" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_import_job_lecturer_id_idx" ON "workspace_import_job" USING btree ("lecturer_id");--> statement-breakpoint
CREATE INDEX "workspace_import_job_status_idx" ON "workspace_import_job" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_import_job_idempotency_idx" ON "workspace_import_job" USING btree ("workspace_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "workspace_import_job_item_job_id_idx" ON "workspace_import_job_item" USING btree ("job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_import_job_item_row_idx" ON "workspace_import_job_item" USING btree ("job_id","row_index");--> statement-breakpoint
CREATE INDEX "workspace_invitation_token_hash_idx" ON "workspace_invitation_token" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "workspace_invitation_token_user_idx" ON "workspace_invitation_token" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workspace_invitation_token_workspace_idx" ON "workspace_invitation_token" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_email_outbox_workspace_id_idx" ON "workspace_email_outbox" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_email_outbox_status_idx" ON "workspace_email_outbox" USING btree ("status");
