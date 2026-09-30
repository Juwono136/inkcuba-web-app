# 03 — Authentication & Security

## Overview

inkcuba uses **Better Auth** with email/password only. Institutional email validation is mandatory. There is **no** OAuth, Google Sign-In, or Firebase.

### Auth routes

| Path | Purpose | Guest only |
|---|---|---|
| `/auth/sign-up` | Register account | Yes |
| `/auth/sign-in` | Login | Yes |
| `/auth/forgot-password` | Request reset email | Yes |
| `/auth/reset-password` | Set new password via token | Yes |

### Dashboard routes (authenticated)

| Path | Access |
|---|---|
| `/dashboard` | Redirects by role |
| `/dashboard/student` | `STUDENT` |
| `/dashboard/lecturer` | `LECTURER` |
| `/dashboard/admin` | `ADMIN` |
| `/dashboard/settings` | Any authenticated user |

---

## Sign up (Get Started)

### Required fields

| Field | Rules |
|---|---|
| Full name | 2–100 characters |
| Email | `@binus.edu` or `@binus.ac.id` |
| BINUSIAN ID | Alphanumeric, 5–20 chars (stored as `nim`; self-signup is always STUDENT) |
| Campus | One of the official BINUS campus labels |
| Password | Min 8 chars + 1 uppercase + 1 lowercase + 1 number |
| Confirm password | Must match |

### Profile photo

Not collected on sign-up. A Dicebear default avatar is assigned. Users change their photo later in **My Settings**.

### Campuses

See `BINUS_CAMPUSES` in `src/lib/auth/constants.ts` (e.g. BINUS @Kemanggisan, BINUS @Alam Sutera, …).

### Role assignment

- Public sign-up always sets `role = STUDENT` (server `databaseHooks.user.create.before`).
- `LECTURER` / `ADMIN` are assigned later by operators (seed / Admin User Management).

### Post-registration

1. Account is created with `emailVerified = false`.
2. Verification email is sent automatically (`sendOnSignUp: true`).
3. Better Auth `requireEmailVerification: true` + `autoSignIn: false` — user **cannot** sign in until the email link is confirmed.
4. UI redirects to `/auth/sign-in?registered=1` with guidance toast.

### Security details

- Server-side institutional email validation in Better Auth `databaseHooks.user.create.before`
- Password strength enforced on client (Zod) and server (auth API middleware for sign-up / reset)
- No registration-time storage upload (avatars are managed in Settings)

---

## Sign in

### Flow

1. Validate BINUS email + password.
2. Call Better Auth `signIn.email`.
3. Redirect to `callbackUrl` or role dashboard.
4. Optionally save credentials when **Remember my login details** is checked.

### Remember me (device credentials)

| | Session (7 days) | Remember me |
|---|---|---|
| Purpose | Keep user logged in | Prefill email/password on this device |
| Storage | HttpOnly session cookie | Encrypted payload in `localStorage` |
| Controlled by checkbox? | No | Yes |

Implementation: `src/lib/auth/remember-credentials.ts` (AES-GCM via Web Crypto).

If checkbox is unchecked on successful login, remembered credentials are cleared.

---

## Email verification

- Enabled: `requireEmailVerification: true`
- Sign-up does **not** auto-login: `autoSignIn: false`
- Sent on sign-up: `sendOnSignUp: true`
- After verification: `autoSignInAfterVerification: true` (session starts only after the email link is confirmed)
- Template: professional HTML + plain text (`src/lib/email/templates.ts`)
- Service wrapper: `sendVerificationEmail`
- Sign-in UI surfaces a clear “verify your email” toast when Better Auth rejects unverified credentials

---

## Forgot & reset password

### Forgot password (`/auth/forgot-password`)

1. User enters BINUS email.
2. Client calls `requestPasswordReset` with `redirectTo` → `/auth/reset-password`.
3. If account exists, reset email is sent.
4. UI shows a generic success state (does not reveal whether email is registered).

### Reset password (`/auth/reset-password?token=...`)

1. User opens email link.
2. Form requires new password + confirm (same strength rules).
3. Client calls `resetPassword({ newPassword, token })`.
4. On success → redirect to sign-in.
5. Invalid/expired token shows recovery UI (request new link).

### Server policy

- Token TTL: **1 hour** (`resetPasswordTokenExpiresIn: 3600`)
- `revokeSessionsOnPasswordReset: true`
- Rate limited endpoints: `/api/auth/request-password-reset`, `/api/auth/reset-password`

### Change password (My Settings)

1. User submits current + new + confirm password (client Zod + strength rules).
2. Confirm modal before submit.
3. Client calls Better Auth `changePassword` with `revokeOtherSessions: true`.
4. On success: `POST /api/settings/password-changed` sends a notification email; remembered device credentials for that email are cleared.
5. Invalid current password surfaces as a field/toast error.

### Login history (My Settings)

1. Each new Better Auth session is recorded in `login_history` (IP + user agent).
2. Users view the last **7 days** on My Settings (`GET /api/settings/login-history`).
3. UI highlights **This device**, **Active**, and **Ended** sessions; paginated for large lists.
4. Location is shown as plain language (`Private network`, `This computer`, …) — raw IPv6 blobs are never shown.
5. On large screens, Login History sits **beside** Security (not buried at the bottom).
6. Older rows are pruned on read (retention = 7 days).

---

## Account activation & soft delete

| Field | Behavior |
|---|---|
| `user.is_active` | Must be `true` to create a new session. Deactivation revokes all sessions immediately. |
| `user.deleted_at` | Soft-deleted accounts cannot sign in. Kept for **30 days**, then hard-deleted (opportunistic prune on admin user list). |

Enforced in Better Auth `databaseHooks.session.create.before`. Inactive/deleted users see a clear contact-admin message.

Admins manage activation, roles, soft delete, restore, and permanent remove via **User Management** (`/dashboard/admin/users`). Admins cannot deactivate/delete themselves or demote/delete the last active administrator.

---

## Session management

| Setting | Value |
|---|---|
| Max session age | 7 days |
| Update age | 24 hours |
| Cookie cache | 5 minutes |
| Cookie prefix | `inkcuba` |
| Secure cookies | Production only |

### Session expired UX

- `SessionWatcher` polls `/api/auth/get-session` every 60s on the client.
- If session disappears while on a dashboard route → toast + redirect to `/auth/sign-in?expired=1`.
- Sign-in page shows a one-time expired notice toast.

### Logout

1. User opens profile dropdown → **Log out**.
2. `ConfirmDialog` asks for confirmation.
3. `signOut` clears session.
4. Redirect to sign-in.

---

## Route protection

### proxy.ts (edge/proxy)

1. Authenticated user on any `/auth/*` → redirect dashboard.
2. Unauthenticated user on `/dashboard/*` → redirect sign-in with `callbackUrl`.
3. Always attach security headers (`X-Frame-Options`, `nosniff`, Referrer-Policy, Permissions-Policy).

### Server helpers

| Helper | Behavior |
|---|---|
| `getSession()` | Read current session |
| `requireAuth()` | Redirect to sign-in if missing |
| `redirectIfAuthenticated()` | Redirect to dashboard if present |
| `requireRole([...])` | Enforce role membership |

---

## Rate limiting

When `AUTH_LOCKOUT_ENABLED=true`, Redis limits sensitive POSTs (20 attempts / 15 minutes per IP):

- `/api/auth/sign-in/email`
- `/api/auth/sign-up/email`
- `/api/auth/request-password-reset`
- `/api/auth/reset-password`

Avatar uploads use a separate Redis limiter (`avatar-upload:{ip}`).

---

## Password policy

Shared validator: `src/lib/validators/password.ts`

Must include:

1. Minimum 8 characters (max 128)
2. At least one lowercase letter
3. At least one uppercase letter
4. At least one number

UI checklist component: `PasswordRequirements`.

---

## Key source files

| File | Role |
|---|---|
| `src/lib/auth/auth.ts` | Better Auth server config |
| `src/lib/auth/client.ts` | Browser auth client |
| `src/lib/auth/permissions.ts` | Domain/role helpers |
| `src/lib/auth/session.ts` | Server session helpers |
| `src/lib/auth/remember-credentials.ts` | Device credential storage |
| `src/proxy.ts` | Route guards |
| `src/components/auth/*` | Auth UI forms |
| `src/components/layout/user-menu.tsx` | Profile dropdown + logout confirm |

---

## Next reading

- [06 — Email System](./06-email-system.md)
- [10 — User Manual](./10-user-manual.md)
