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

### `PATCH /api/settings/profile`

Updates public profile fields (bio, skills, social URLs, portfolio URLs).  
Bio HTML is sanitized server-side (allowed: `p`, `br`, `strong`/`b`, `em`/`i`, `ul`/`ol`/`li`, `a` with http(s)/mailto). Plain-text length max **8000**.  
Custom links: up to **4** `{ label, url }` objects (`portfolioLinks`); labels are user-defined (max 40 chars) and unique.  
**403** for `ADMIN`. Students and lecturers only.

### `POST /api/settings/avatar`

`multipart/form-data` with `file`. Max **5MB**; HEIC/HEIF converted to JPEG. Uploads to SeaweedFS under `avatars/users/{userId}/...`, updates `user.image`, then deletes the previous storage object (when present) so storage stays in sync with the app.

### `DELETE /api/settings/avatar`

Deletes the previous SeaweedFS object (when key-based) and sets a Dicebear default image URL on `user.image`.

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

Full read-only detail (identity + profile fields) including trash rows.

### `PATCH /api/admin/users/[userId]`

Body (at least one field required):

```json
{ "role": "STUDENT|LECTURER|ADMIN", "isActive": true }
```

Only `role` and `isActive` are mutable. Deactivating revokes all sessions. Guards: cannot change own role / deactivate self; cannot demote or deactivate the last active admin.

### `DELETE /api/admin/users/[userId]`

Soft-delete (sets `deleted_at`, forces inactive, revokes sessions). Idempotent if already in trash.

### `DELETE /api/admin/users/[userId]?hard=true`

Permanent delete — only allowed when the user is already in trash. Cascades related rows and removes SeaweedFS avatar objects when present.

### `POST /api/admin/users/[userId]/restore`

Clears `deleted_at`. Restored accounts remain **inactive** until an admin activates them.

---

## Media proxy

### `GET /api/media/[...key]`

Streams object bytes from storage for allowed prefixes (`avatars/`).

Headers:

- `Content-Type` from storage (or fallback)
- `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`

Used by `UserAvatar` so browsers never need SeaweedFS Basic Auth credentials.

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
