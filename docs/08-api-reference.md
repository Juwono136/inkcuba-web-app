# 08 — API Reference

Base URL (local): `http://localhost:3000`

All responses should be treated as JSON unless noted (media proxy returns binary).

---

## Health

### `GET /api/health`

Basic liveness payload.

### `GET /api/health?detailed=true`

Requires token via:

- `Authorization: Bearer <HEALTH_CHECK_TOKEN>`, or
- `x-health-token: <HEALTH_CHECK_TOKEN>`

Returns status for:

- database
- redis
- storage
- email

Overall status: `healthy` | `degraded` | `unhealthy`.

Supports CORS preflight (`OPTIONS`).

---

## Better Auth catch-all

### `GET|POST /api/auth/[...all]`

Handled by Better Auth (`toNextJsHandler`).

Important operations used by the app:

| Client call | Endpoint (approx.) | Purpose |
|---|---|---|
| `signUp.email` | `POST /api/auth/sign-up/email` | Register |
| `signIn.email` | `POST /api/auth/sign-in/email` | Login |
| `signOut` | Better Auth sign-out route | Logout |
| `get-session` / `useSession` | `GET /api/auth/get-session` | Session read |
| `requestPasswordReset` | `POST /api/auth/request-password-reset` | Forgot password |
| `resetPassword` | `POST /api/auth/reset-password` | Apply new password |

### Extra guards on this route

1. Redis auth rate limiting for sensitive POSTs (when enabled).
2. Password strength validation middleware for:
   - sign-up (`password`)
   - reset-password (`newPassword`)

---

## Avatar API

### `POST /api/auth/avatar`

`multipart/form-data`

| Field | Required | Description |
|---|---|---|
| `file` | Yes | Image file |
| `email` | Yes | Valid BINUS email (namespacing + validation) |

Success:

```json
{
  "success": true,
  "data": {
    "url": "http://localhost:8333/inkcuba/avatars/register/....jpg",
    "key": "avatars/register/....jpg"
  }
}
```

Errors: validation, rate limit, storage failure (standardized API error envelope).

### `DELETE /api/auth/avatar?key=...`

Deletes an uploaded registration avatar key under `avatars/register/` only.

---

## Settings API (authenticated)

### `GET /api/settings`

Returns aggregated identity + public profile for the current user. Upserts an empty student/lecturer profile row on read when missing.

Identity includes stored directory **values** (`campus`, `major`, `batch`, `semester`, `department`) plus `directoryLabels` — the current Directory Options **labels** for those values (inactive options included). Clients should display `directoryLabels.*` and keep submitting the stored values when editing.

### `PATCH /api/settings/profile`

Updates public profile fields (bio, skills, social URLs, portfolio links).  
Bio HTML is sanitized server-side (allowed: `p`, `br`, `strong`/`b`, `em`/`i`, `ul`/`ol`/`li`, `a` with http(s)/mailto). Plain-text length max **8000**.  
Custom links: up to **4** `{ label, url }` objects (`portfolioLinks`); labels are user-defined (max 40 chars) and unique.  
**403** for `ADMIN`. Students and lecturers only.

### `PATCH /api/settings/identity`

Any authenticated role. Updates only fields allowed by **Field Permissions** for that role (defaults: lecturers/admins → name + title). Name rules match User Management / signup (`personNameSchema`: letters, spaces, `' . , - ( )`). Directory-backed fields are validated against active options. Audited as `user.self_update_identity`.

### `POST /api/settings/avatar`

`multipart/form-data` with `file`. Max **5MB**; HEIC/HEIF converted to JPEG. Uploads to SeaweedFS under `avatars/users/{userId}/...`, updates `user.image`, then deletes the previous storage object (when present) so storage stays in sync with the app.

### `DELETE /api/settings/avatar`

Deletes the previous SeaweedFS object (when key-based) and sets a Dicebear default image URL on `user.image`.

### `POST /api/admin/users/[userId]/avatar` (ADMIN)

Same SeaweedFS replace semantics as settings avatar, for a target user. Audited as `user.avatar_update`.

### `DELETE /api/admin/users/[userId]/avatar` (ADMIN)

Removes target user photo from storage and sets Dicebear default. Idempotent. Audited as `user.avatar_delete`.

### `GET /api/admin/role-field-permissions` (ADMIN)

Returns permission matrix + field metadata for the Field Permissions admin UI.

### `PUT /api/admin/role-field-permissions` (ADMIN)

Bulk upsert `{ items: [{ role, field, editableBySelf }] }`. Audited as `role_field_permission.update`.

### `POST /api/settings/password-changed`

Sends the password-changed notification email after a successful Better Auth `changePassword`. Rate limited per user.

### `GET /api/settings/login-history`

Returns paginated login events for the current user from the last **7 days** (`login_history` table).

Query params: `page` (default 1), `pageSize` (default 10, max 50).

Each item includes device/browser/OS labels, IP, timestamps, and flags for **this device** / **active** / **ended**. Rate limited per user.

---

## Admin User Management API (ADMIN only)

All routes require an authenticated session with role `ADMIN`. Responses use the standard envelope. Mutations write `audit_log` entries. Rate limited per admin.

### `GET /api/admin/users`

Paginated user directory.

| Query | Default | Notes |
|---|---|---|
| `page` | `1` | |
| `pageSize` | `20` | Max `100` |
| `q` | `""` | Debounced search: name, email, campus, NIM, NIDN |
| `role` | `ALL` | `ALL` \| `STUDENT` \| `LECTURER` \| `ADMIN` |
| `status` | `ALL` | `ALL` \| `ACTIVE` \| `INACTIVE` (ignored in trash) |
| `sortBy` | `createdAt` | `name` \| `email` \| `role` \| `createdAt` \| `lastLoginAt` \| `isActive` |
| `sortDir` | `desc` | `asc` \| `desc` |
| `trash` | `false` | Soft-deleted users only when `true` |

Also opportunistically hard-deletes soft-deleted users older than **30 days**.

### `GET /api/admin/users/[userId]`

Full detail (identity + profile fields) including trash rows. Includes `directoryLabels` (current Directory Options labels for stored campus/major/batch/semester/department values) so admin UI stays in sync after label renames.

### `PATCH /api/admin/users/[userId]`

Body (at least one field required). Mutable fields:

| Field | Notes |
|---|---|
| `role` | `STUDENT` \| `LECTURER` \| `ADMIN` |
| `isActive` | boolean; deactivating revokes sessions |
| `name` | 2–100 chars; letters, spaces, and `' . , - ( )` (e.g. `Manuaba, Ph.D`) |
| `campus` | Must match an **active** Directory Option (`campus`), or `null`/empty to clear |
| `nim` / `nidn` | Student / Lecturer IDs (alphanumeric + `_` `-`), or clear |
| `major` / `batch` / `semester` / `department` | Active Directory Options, or clear |
| `title` | Free text (2–80) or clear |

Guards: cannot change own role / deactivate self; cannot demote or deactivate the last active admin. Profile rows are upserted as needed. Audit metadata includes per-field `{ from, to }` under `changes`.

### `DELETE /api/admin/users/[userId]`

Soft-delete (sets `deleted_at`, forces inactive, revokes sessions). Idempotent if already in trash.

### `DELETE /api/admin/users/[userId]?hard=true`

Permanent delete — only allowed when the user is already in trash. Cascades related rows and removes SeaweedFS avatar objects when present.

### `POST /api/admin/users/[userId]/restore`

Clears `deleted_at`. Restored accounts remain **inactive** until an admin activates them.

---

## Admin Directory Options API (ADMIN only)

### `GET /api/admin/directory-options`

Paginated list. Query: `category?`, `activeOnly?`, `q?` (label/value search), `page` (default 1), `pageSize` (default 20, max 100).

Response: `{ items, total, page, pageSize, totalPages }`. Seeds default campuses when the campus category is empty.

### `POST /api/admin/directory-options`

Create option: `{ category, label, isActive? }`.

- `value` is set server-side to the trimmed label (immutable afterward)
- `sortOrder` is appended at the end of the category

### `PATCH /api/admin/directory-options/[optionId]`

Update `{ label?, isActive? }` (at least one required). Does not change `value` or `sortOrder`.

### `POST /api/admin/directory-options/reorder`

Reorder within a category: `{ category, orderedIds }`.

- `orderedIds` must be a permutation of a **contiguous** slice of the category’s current order (typically the current page with no search filter)
- Idempotent when order is unchanged; audited as `directory_option.reorder`

### `DELETE /api/admin/directory-options/[optionId]`

Hard-delete option (idempotent).

### `GET /api/directory-options`

Public read of **active** options (optional `category`). Used by admin selects and future forms.

---

## Media proxy

### `GET /api/media/[...key]`

Streams object bytes from storage for allowed prefixes (`avatars/`, `workspaces/`).

Headers:

- `Content-Type` from storage (or fallback)
- `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`

Used by `UserAvatar` and workspace backgrounds/description images so browsers never need SeaweedFS Basic Auth credentials.

---

## Lecturer Workspaces API (LECTURER only)

### `GET /api/lecturer/workspaces`

Paginated list of owned workspaces. Query:

| Param | Default | Notes |
|---|---|---|
| `page` | `1` | |
| `pageSize` | `12` | max 48 |
| `q` | | Search name / class / semester (ilike) |
| `semester` | | Exact Directory Options value |
| `status` | `ALL` | `ALL` \| `DRAFT` \| `ACTIVE` \| `INACTIVE` |
| `sortBy` | `updatedAt` | `updatedAt` \| `createdAt` \| `name` \| `className` \| `semester` |
| `sortDir` | `desc` | `asc` \| `desc` |

Response: `{ items, total, page, pageSize, totalPages }`.

### `POST /api/lecturer/workspaces`

Create workspace. Accepts JSON or `multipart/form-data` with fields `name`, `className`, `semester`, `description?`, `status?` (`DRAFT` \| `ACTIVE` \| `INACTIVE`, default **`DRAFT`**), optional file `background`. Semester must be an active Directory Option. Audited as `workspace.create`.

### `GET|PATCH|DELETE /api/lecturer/workspaces/[workspaceId]`

Owner-only detail / update / hard delete. PATCH body: `name?`, `className?`, `semester?`, `description?`, `status?`. **Students may access a workspace only when `status === ACTIVE`** (enforced by `assertStudentCanAccessWorkspace` / `assertStudentCanAccessWorkspaceByInviteCode` for future student routes). Delete removes SeaweedFS background + description images. Audited as `workspace.update` / `workspace.delete`.

### `DELETE /api/lecturer/workspaces/[workspaceId]`

Soft-delete (default): body `{ confirmName }` must match the workspace name exactly → sets `deleted_at` and status `INACTIVE`.  
Hard-delete: `?hard=true` + `{ confirmName }` — only for workspaces already in trash; removes DB row + SeaweedFS assets.

### `POST /api/lecturer/workspaces/[workspaceId]/restore`

Restore from trash (`deleted_at` cleared). Workspace stays **Inactive** until the lecturer sets Active again.

### `GET /api/lecturer/workspaces?trash=true`

Paginated trash list for the current lecturer (includes `daysUntilPurge`).

### `POST|DELETE /api/lecturer/workspaces/[workspaceId]/background`

Replace or clear background (multipart `file` on POST). Upload → DB → delete previous key.

### `POST /api/lecturer/workspaces/[workspaceId]/description-image`

Upload an image for TipTap description inserts. Returns `{ key, url }` (`/api/media/...`).

### `POST /api/lecturer/workspaces/tmp-description-image`

Same as above for create-form drafts under `workspaces/tmp/{lecturerId}/`.

### People / members

| Method | Path | Notes |
|---|---|---|
| GET | `/api/lecturer/workspaces/[id]/members` | Paginated members (`q`, `page`, `pageSize`); server-side search |
| GET | `.../members/candidates` | Debounced student search (excludes current members) |
| POST | `.../members` | Body `{ userIds[] }` — manual invite batch (max 50); emails queued |
| DELETE | `.../members/[memberId]` | Soft-remove (`REMOVED`) |
| GET | `.../members/template` | Download styled `.xlsx` (Student Name, Student ID / NIM, Student Email, Academic Program, Batch); live Directory majors + batch dropdowns + Instructions/reference sheets |
| POST | `.../members/import` | Multipart `file` → parse + preview job (SeaweedFS `workspaces/{id}/imports/`) |
| GET | `.../members/import/[jobId]` | Job status + paginated preview items |
| PATCH | `.../members/import/[jobId]/items/[itemId]` | Edit preview row (revalidates major/email/NIM) |
| POST | `.../members/import/[jobId]/commit` | Idempotent async commit via BullMQ (`Idempotency-Key` header) |

### Student join & workspace detail

| Method | Path | Notes |
|---|---|---|
| GET | `/api/student/workspaces` | Paginated joined workspaces (`q`, `semester`, `className`, `page`, `pageSize`); response includes `facets` for filter dropdowns |
| GET | `/api/student/workspaces/[id]` | Membership + Active gate; INVITED → ACTIVE on first open; includes lecturer labels + member count |
| GET | `/api/student/workspaces/[id]/people` | Read-only member list (`q`, `page`, `pageSize`, `status`); membership required; no mutate endpoints |
| POST | `/api/student/workspaces/join` | Body `{ code }` — code must be `[a-z0-9]{8}` (normalized lowercase); Active workspace only; idempotent |
| POST | `/api/auth/activate` | Body `{ token, password, confirmPassword }` — new invitees create password |

Public page `/join` is a server-rendered gate (guests) / join client (students). Post-login `callbackUrl` is validated with `getSafeInternalPath` (open-redirect safe).

### Public profiles

| Method | Path | Notes |
|---|---|---|
| GET | `/api/public/profiles/[identifier]` | Unauthenticated; BINUSIAN ID (`user.nim`) or user id; rate limited; no email/NIDN |
| Page | `/u/[identifier]` | Public SiteHeader/Footer showcase (`max-w-7xl`); Skills above About; share actions in header only |

---

## Standard API envelope

Success (`src/lib/api/response.ts`):

```json
{ "success": true, "data": {} }
```

Failure:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "..."
  }
}
```

Typed errors: `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `RateLimitError`, `AppError`.

---

## CORS

Shared helpers in `src/lib/api/cors.ts` applied to health and auth handlers.

---

## Security notes for API consumers

1. Never expose `HEALTH_CHECK_TOKEN`, SMTP, Redis, or storage passwords to the client.
2. Prefer institutional email validation on all auth-related writes.
3. Treat password-reset and sign-in endpoints as abuse-sensitive (rate limited).
4. Only allow media proxy for intended prefixes.

---

## Next reading

- [09 — Environment & Setup](./09-environment-setup.md)
- [03 — Authentication & Security](./03-authentication-security.md)
