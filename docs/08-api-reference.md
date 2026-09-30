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
**403** for `ADMIN`. Students and lecturers only.

### `POST /api/settings/avatar`

`multipart/form-data` with `file`. Max **5MB**; HEIC/HEIF converted to JPEG. Updates `user.image` under `avatars/users/{userId}/...`.

### `DELETE /api/settings/avatar`

Removes custom photo (when storage-backed) and sets a Dicebear default image URL.

### `POST /api/settings/password-changed`

Sends the password-changed notification email after a successful Better Auth `changePassword`. Rate limited per user.

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
