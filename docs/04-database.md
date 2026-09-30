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
| `workspace_member_status` | `INVITED`, `ACTIVE`, `REMOVED` |

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
| `is_active` | boolean | Default true |
| `created_at` / `updated_at` | timestamp | Audit timestamps |

Indexes: email, role, nim, nidn, campus.

### `session`

Stores Better Auth sessions (`token`, `expires_at`, `user_id`, IP/UA metadata).

### `account`

Credential/account linking table (email-password provider stores password hash here).

### `verification`

Email verification and password-reset tokens.

---

## Profile tables (`src/db/schema/profiles.ts`)

### `student_profile`

`bio`, `major`, `batch`, `semester`, `is_alumni`, `skills[]`,
`linkedin_url`, `github_url`, `instagram_url`, `youtube_url`, `twitter_url`,
`tiktok_url`, `portfolio_urls[]`

### `lecturer_profile`

`bio`, `major`, `department`, `title`, `skills[]`,
`linkedin_url`, `github_url`, `instagram_url`, `youtube_url`, `twitter_url`,
`tiktok_url`, `portfolio_urls[]`

Both reference `user.id` with cascade delete.

Public-profile fields are editable in **My Settings** for students/lecturers.
Identity fields (major/batch/campus/etc.) remain admin-managed and read-only in Settings.

---

## Workspace tables (`src/db/schema/workspaces.ts`)

Supports lecturer-managed course workspaces, assignments, membership, and group formation.

Key concepts:

- Workspace owned/managed by lecturers
- Assignments (`INDIVIDUAL` / `GROUP`)
- Members with status `INVITED` / `ACTIVE` / `REMOVED`
- Group assignment methods `RANDOM` / `MANUAL` / `SELF_SELECT`

> End-to-end workspace UI/API is planned on top of this schema.

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
| `0002_remove_super_admin.sql` | Merge `SUPER_ADMIN` → `ADMIN` (PRD alignment) |

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
