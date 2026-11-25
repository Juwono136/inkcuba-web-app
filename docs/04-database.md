# 04 — Database

## Stack

- **ORM:** Drizzle ORM
- **Database:** PostgreSQL
- **Migrations:** `drizzle/` + `drizzle-kit`
- **Config:** `drizzle.config.ts` (uses `DATABASE_URL`)

---

## Commands

```bash
npm run db:generate   # Generate SQL from schema changes
npm run db:migrate    # Apply pending migrations
npm run db:push       # Push schema directly (dev convenience)
npm run db:studio     # Open Drizzle Studio
npm run db:seed-admin -- --email=admin@binus.ac.id --password=YourPass1 --name="Admin Name"
npm run db:seed-dev-students   # local dummy students only; refuses production and remote databases
```

> After schema changes in code, always generate + migrate so the live database stays aligned. Example past issue: missing `campus` column caused sign-up 500 until migration `0001_rainy_jackpot.sql` was applied.

---

## Enums

Defined in `src/db/schema/enums.ts`:

| Enum | Values |
|---|---|
| `user_role` | `STUDENT`, `LECTURER`, `ADMIN` |
| `portfolio_status` | `DRAFT`, `SUBMITTED`, `IN_REVIEW`, `NEED_REVISION`, `REVISED`, `PUBLISHED`, `TAKEN_DOWN`, `ARCHIVED`. Older values `PENDING_REVIEW`, `REVISION_REQUIRED`, `APPROVED`, `TAKEDOWN` stay in the enum so existing databases keep working |
| `portfolio_document_role` | `PROJECT` (one required file), `ADDITIONAL` (up to 3) |
| `portfolio_event_actor_role` | `STUDENT`, `LECTURER`, `SYSTEM` |
| `portfolio_event_type` | `CREATED`, `SUBMITTED`, `REVIEW_STARTED`, `REVISION_REQUESTED`, `RESUBMITTED`, `PUBLISHED`, `ARCHIVED`, `UNARCHIVED`, `DELETED` |
| `project_email_template` | `PROJECT_SUBMITTED_STUDENT`, `PROJECT_SUBMITTED_LECTURER`, `PROJECT_REVISION_REQUESTED`, `PROJECT_PUBLISHED` |
| `project_email_outbox_status` | `PENDING`, `SENT`, `FAILED` |
| `assignment_type` | `INDIVIDUAL`, `GROUP` |
| `assignment_status` | `DRAFT`, `ACTIVE`, `CLOSED` |
| `assignment_schedule_mode` | `OPEN` (no deadline), `WINDOW` (opens_at–closes_at) |
| `group_assignment_method` | `RANDOM`, `MANUAL` (unused in UI), `SELF_SELECT` |
| `workspace_status` | `DRAFT`, `ACTIVE`, `INACTIVE` — only `ACTIVE` is open to students |
| `workspace_member_status` | `INVITED`, `ACTIVE`, `REMOVED` |
| `workspace_member_source` | `MANUAL`, `EXCEL`, `LINK`, `CODE` |
| `workspace_import_job_status` | `UPLOADED`, `PARSING`, `READY`, `COMMITTING`, `COMPLETED`, `FAILED`, `CANCELLED` |
| `workspace_import_item_status` | `PENDING`, `SKIPPED`, `SUCCESS`, `FAILED` |
| `workspace_invitation_purpose` | `INVITE_EXISTING`, `INVITE_ACTIVATE` |
| `workspace_email_template` | `INVITE_EXISTING`, `INVITE_REGISTERED_NO_LOGIN`, `INVITE_ACTIVATE` |
| `workspace_email_outbox_status` | `PENDING`, `SENT`, `FAILED` |

---

## Auth tables (`src/db/schema/auth.ts`)

### `user`

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | Better Auth user id |
| `name` | text | Full name |
| `email` | text unique | Institutional email |
| `email_verified` | boolean | Default false |
| `image` | text nullable | Avatar URL |
| `role` | user_role | Default STUDENT |
| `nim` | text nullable | Student BINUSIAN ID |
| `nidn` | text nullable | Lecturer ID |
| `campus` | text nullable | Campus name |
| `is_active` | boolean | Default true; inactive users cannot create sessions |
| `deleted_at` | timestamp nullable | Soft-delete marker; null = not in trash. Auto-purged after **30 days** |
| `created_at` / `updated_at` | timestamp | Audit timestamps |

Indexes: email, role, nim, nidn, campus, `is_active`, `deleted_at`.

Soft-deleted users remain in the table (email unique still held) until restore or hard delete. Hard delete cascades sessions/accounts/profiles/login history and removes SeaweedFS avatar objects when present.

### `session`

Stores Better Auth sessions (`token`, `expires_at`, `user_id`, IP/UA metadata).

### `account`

Credential/account linking table (email-password provider stores password hash here).

### `verification`

Email verification and password-reset tokens.

### `login_history` (`src/db/schema/login-history.ts`)

Durable sign-in events for **My Settings → Login History** (last **7 days**).

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | UUID |
| `user_id` | text FK → user | Cascade delete |
| `session_id` | text nullable | Links to Better Auth session when still known |
| `ip_address` / `user_agent` | text nullable | Captured at sign-in |
| `created_at` | timestamp | When the login happened |

Written from Better Auth `databaseHooks.session.create.after`. Rows older than 7 days are pruned on read. Migration: `0004_login_history.sql`.

---

## Profile tables (`src/db/schema/profiles.ts`)

### `student_profile`

`bio`, `major`, `batch`, `semester`, `is_alumni`, `skills[]`,
`linkedin_url`, `github_url`, `instagram_url`, `youtube_url`, `twitter_url`,
`tiktok_url`, `portfolio_links` (jsonb `{ label, url }[]`), `department`, `title`

### `lecturer_profile`

`bio`, `major`, `department`, `title`, `skills[]`,
`linkedin_url`, `github_url`, `instagram_url`, `youtube_url`, `twitter_url`,
`tiktok_url`, `portfolio_links` (jsonb `{ label, url }[]`)

Both reference `user.id` with cascade delete.

### `directory_option`

Admin-managed selectable values for identity forms.

| Column | Notes |
|---|---|
| `category` | enum: `campus`, `major`, `batch`, `semester`, `department` |
| `label` | Display name shown in Directory Options, selects, My Settings, and User Management |
| `value` | Immutable key stored on `user.campus` / profile directory fields (unique per category). Copied from the label at create time; never rewritten when the label changes |
| `sort_order` / `is_active` | Display order (managed via drag-and-drop reorder API) + soft disable without deleting |

**Display sync:** My Settings and User Management detail responses include `directoryLabels` resolved from the current `label` for each stored `value` (including inactive options). Renaming a Directory Options label therefore updates what users see without migrating profile rows. Orphan values (option deleted) fall back to showing the raw stored key.

### `role_field_permission`

Per-role toggles for which identity fields users may edit on My Settings.

| Column | Notes |
|---|---|
| `role` | `STUDENT` / `LECTURER` / `ADMIN` |
| `field` | enum: `name`, `title`, `campus`, `nim`, `nidn`, `major`, `batch`, `semester`, `department` |
| `editable_by_self` | When true, that role may PATCH the field via `/api/settings/identity` |

Unique on `(role, field)`. Seeded with product defaults on first read.

Public-profile fields are editable in **My Settings** for students/lecturers.
Identity self-edit is gated by Field Permissions; admins can always edit all identity fields (and avatars) in User Management. ADMIN title/major/department are stored on `lecturer_profile` so admin edits stay in sync with My Settings.

---

## Workspace tables (`src/db/schema/workspaces.ts`)

Supports lecturer-managed class workspaces (portfolio verification entry point), plus future membership, assignments, and groups.

### `workspace` (Phase 1 product fields)

| Column | Notes |
|---|---|
| `name` | Required display name |
| `class_name` | Required class label (e.g. LA01) |
| `semester` | Required Directory Options **value** (category `semester`) |
| `description` | Optional sanitized HTML (rich text + images), plain-text max 8000 |
| `background_image_key` / `background_image_url` | Optional SeaweedFS background (null → brand gradient default in UI) |
| `invite_code` | Unique join code: exactly **8** chars, lowercase letters + digits only (`[a-z0-9]{8}`); legacy codes are migrated on lecturer detail load |
| `deleted_at` | Soft-delete / trash marker (`null` = not in trash). Separate from lifecycle `status`. Retention **30 days** then hard purge |
| `lecturer_id` | Owner (cascade on user delete) |
| `status` | `DRAFT` \| `ACTIVE` \| `INACTIVE` (default `DRAFT` on create). Students may access only `ACTIVE`. |

Partial unique on `(lecturer_id, name, class_name, semester) WHERE deleted_at IS NULL`. Indexes on `status`, `deleted_at`. Migrations: `0009`–`0012` (soft-delete).

### `workspace_member` (People tab)

| Column | Notes |
|---|---|
| `user_id` | Student user FK; unique per `(workspace_id, user_id)` |
| `status` | `INVITED` \| `ACTIVE` \| `REMOVED` |
| `source` | `MANUAL` \| `EXCEL` \| `LINK` \| `CODE` |
| `invited_by` / `invited_at` / `joined_at` / `removed_at` | Lifecycle timestamps |

### Import & invite support tables

- `workspace_import_job` / `workspace_import_job_item` — Excel upload → preview → async BullMQ commit
- `workspace_invitation_token` — hashed activation tokens for new students (no plaintext passwords)
- `workspace_email_outbox` — invite email audit + retry visibility

Also live: `assignment` (submission slot), `assignment_group`, `assignment_group_member`, `assignment_rubric_component`. Migration `0013_workspace_submissions` + `0017_rubric_scoring`.

### `assignment` (submission slot)

| Column | Notes |
|---|---|
| `title` | Required, 3–120 characters |
| `description` | Optional sanitized HTML (bold, italic, lists, links). No images. Plain text max **2500** |
| `type` | `INDIVIDUAL` or `GROUP` |
| `group_method` | `RANDOM` or `SELF_SELECT` when type is `GROUP` |
| `max_group_size` | 2–20, required for groups |
| `max_score` | Integer 1–1000; component max points are derived from rubric weights |
| `schedule_mode` | `OPEN` or `WINDOW` |
| `opens_at` / `closes_at` | Required together for `WINDOW`; both null for `OPEN`. `due_date` is unused |
| `status` | `DRAFT` (lecturer only), `ACTIVE` (students can see and move groups), `CLOSED` (read-only) |

### `assignment_rubric_component`

Assessment rubric defined once per submission. Weights are whole percents that must total **exactly 100%**. Each component’s max points = allocated share of `max_score` (integer rounding so component maxes sum to `max_score`). Editable while Draft/Active until the first `portfolio_score_sheet` exists for that assignment; after that, names/weights lock (description-only tweaks allowed).

| Column | Notes |
|---|---|
| `name` / `description` | Component label + optional guidance |
| `weight_percent` | 1–100; sum per assignment must be 100 when complete |
| `sort_order` | Display order |

`assignment_group_member` stores `assignment_id` with a unique `(assignment_id, user_id)` so one student cannot sit in two groups of the same submission. Removing a workspace member deletes those group rows in the same transaction. Group moves lock the submission row. Random assignment replaces groups inside one transaction. Adding groups also locks the submission row and inserts the requested empty groups in one transaction (1–50 per request, 200 groups maximum). Each group's `max_members` follows `max_group_size`. Total seats on the board is the sum of those capacities, so three groups with a size of 2 show 6 seats.

Deleting a submission or hard-deleting a workspace does not delete student projects. Those foreign keys use `ON DELETE SET NULL`. Snapshot columns on `portfolio` keep the workspace name, class, semester, submission title, lecturer, campus, major, batch, and academic semester. Project files in SeaweedFS are left in place.

---

## Portfolio tables (`src/db/schema/portfolios.ts`)

One project per student on an individual submission (`assignment_id` + `submitted_by_id`, `group_id` null). One shared project per group (`assignment_id` + `group_id`). `workspace_id` and `assignment_id` are optional so a project remains after the source is deleted.

Student writes: save a draft, submit (`DRAFT` → `SUBMITTED`), resubmit (`NEED_REVISION` → `REVISED`), archive, and hard-delete when allowed. Lecturer moderation opens review (`SUBMITTED`/`REVISED` → `IN_REVIEW`), then either requests revision (`NEED_REVISION` + sanitized rich-text feedback only — **no scores**) or publishes (`PUBLISHED` + rubric score sheet). A project allows at most **`PROJECT_MAX_REVISIONS` (2)** `REVISION_REQUESTED` events; further revision requests are rejected and the lecturer must publish. Scoring is **rubric-based on publish only**: each publish persists a `portfolio_score_sheet` (component scores, optional group/individual split, per-member finals). `portfolio.grade` / `portfolio.feedback` remain denormalized snapshots for banners; the score sheet is the source of truth for the scoring-sheet UI. Group membership moves are blocked while the portfolio is `SUBMITTED` / `IN_REVIEW` / `REVISED` / `PUBLISHED` and unlock again on `DRAFT` / `NEED_REVISION`. Submission **type** and **group formation method** freeze (`structureLocked`) once any project on that assignment hits those pipeline statuses (including `NEED_REVISION`). Take-down UI is not shipped yet.

### Score sheet tables (migrations `0017_rubric_scoring`, `0019_member_component_scores`)

- `portfolio_score_sheet` — one row per **publish**: `scoring_mode` (`INDIVIDUAL`\|`GROUP_ONLY`\|`GROUP_AND_INDIVIDUAL`), split percents, `group_total`, denormalized `final_grade`, sanitized `group_feedback` (revision requests do **not** create a sheet)
- `portfolio_score_component` — **group** (or sole) per-rubric score snapshot (`score`, `max_points`, weight, name/description copies)
- `portfolio_member_score` — per-student `individual_score` (sum of that member’s rubric components for `GROUP_AND_INDIVIDUAL`; null otherwise), `final_grade` (blend or group total)
- `portfolio_member_component_score` — per-student **rubric component** scores when mode is `GROUP_AND_INDIVIDUAL` (same components as the group sheet)

Final grade for split mode: `round(groupTotal × groupPercent/100 + individualTotal × individualPercent/100)`, capped to `max_score`. Both totals are on the 0…`max_score` scale.

`portfolio_event` stores the user-facing history timeline (and is the base for future lecturer KPI queries). `project_email_outbox` queues moderation emails for the BullMQ worker.

`portfolio_image` holds 1–3 overview images. `portfolio_video` holds one optional overview video. `portfolio_document.role` is `PROJECT` or `ADDITIONAL`. `portfolio_link` holds up to 3 extra links. `portfolio_contributor` records who may see the project after leaving a group or after the submission is removed (`group_id` / `assignment_id` / `workspace_id` become null via `ON DELETE SET NULL`; snapshots keep the labels). Live group edits stay limited to current `assignment_group_member` rows. Hard delete cascades DB children and removes matching SeaweedFS keys under `projects/{portfolioId}/`.

---

## Audit (`src/db/schema/audit.ts`)

Audit log table for security/operational events. Helpers live under `src/lib/audit`.

---

## Migrations present

| Migration | Purpose |
|---|---|
| `0000_mean_apocalypse.sql` | Initial schema |
| `0001_rainy_jackpot.sql` | Add `user.campus` + index |
| `0007_directory_options.sql` | Directory options table |
| `0008_role_field_permissions.sql` | Role field permission matrix |
| `0009_workspace_product_fields.sql` | Workspace name/class/semester/background reshape |
| `0010_workspace_status.sql` | Replace `is_active` with `workspace_status` enum (`DRAFT`/`ACTIVE`/`INACTIVE`) |
| `0011_workspace_people.sql` | People tab: member source fields, import jobs/items, invitation tokens, email outbox |
| `0014_student_projects.sql` | Project statuses, snapshot columns, optional workspace/submission links, document role, overview video, unique project per student or group |
| `0015_project_moderation.sql` | `portfolio_event`, `project_email_outbox`, scoring list indexes |
| `0017_rubric_scoring.sql` | Rubric components + portfolio score sheet / component / member score tables |
| `0018_portfolio_score_comp_rubric_fk.sql` | Short FK name `portfolio_score_comp_rubric_fk` (avoids Postgres 63-char truncate / `db:push` rename loop) |
| `0019_member_component_scores.sql` | `portfolio_member_component_score` for per-student rubric scores in `GROUP_AND_INDIVIDUAL` |
| `0020_member_comp_fk_names.sql` | Short FK names on member component scores (avoids Postgres 63-char truncate / `db:push` rename loop) |

Migration journal: `drizzle/meta/_journal.json`.

---

## Data consistency checklist

1. Keep Drizzle schema as source of truth.
2. Generate migration for every schema change.
3. Run `npm run db:migrate` on each environment.
4. Verify columns exist before debugging auth/API 500s that look like query failures.
5. Never commit real `.env` secrets.

---

## Next reading

- [05 — Storage & Media](./05-storage-media.md)
- [09 — Environment & Setup](./09-environment-setup.md)
