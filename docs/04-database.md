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
```

> After schema changes in code, always generate + migrate so the live database stays aligned. Example past issue: missing `campus` column caused sign-up 500 until migration `0001_rainy_jackpot.sql` was applied.

---

## Enums

Defined in `src/db/schema/enums.ts`:

| Enum | Values |
|---|---|
| `user_role` | `STUDENT`, `LECTURER`, `ADMIN` |
| `portfolio_status` | `DRAFT`, `PENDING_REVIEW`, `REVISION_REQUIRED`, `APPROVED`, `TAKEDOWN`, `ARCHIVED` |
| `assignment_type` | `INDIVIDUAL`, `GROUP` |
| `group_assignment_method` | `RANDOM`, `MANUAL`, `SELF_SELECT` |
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
| `lecturer_id` | Owner (cascade on user delete) |
| `status` | `DRAFT` \| `ACTIVE` \| `INACTIVE` (default `DRAFT` on create). Students may access only `ACTIVE`. |

Unique on `(lecturer_id, name, class_name, semester)`. Index on `status`. Migrations: `0009_workspace_product_fields`, `0010_workspace_status`, `0011_workspace_people`.

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

Also present (future): `assignment`, `assignment_group`, `assignment_group_member`.

> Lecturer People tab is live (manual add, Excel import, invite link/code). Submission / Scoring remain Coming Soon. Student join via `/join` + `POST /api/student/workspaces/join`.

---

## Portfolio tables (`src/db/schema/portfolios.ts`)

Supports academic portfolio records, media assets, and review/publication lifecycle using `portfolio_status`.

Typical future flow:

`DRAFT` → `PENDING_REVIEW` → (`REVISION_REQUIRED` ↔) → `APPROVED` → public exhibition  
(also supports `TAKEDOWN` / `ARCHIVED`)

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
