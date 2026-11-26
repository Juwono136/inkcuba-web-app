CREATE INDEX IF NOT EXISTS "workspace_import_job_item_job_status_idx"
  ON "workspace_import_job_item" ("job_id", "status");
