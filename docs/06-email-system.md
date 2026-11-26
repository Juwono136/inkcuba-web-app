# 06 — Email System

## Overview

Transactional email is sent with **Nodemailer** over SMTP (commonly Gmail App Password).

| Module | Path |
|---|---|
| Transport client | `src/lib/email/client.ts` |
| HTML layout | `src/lib/email/layout.ts` |
| Templates | `src/lib/email/templates.ts` |
| Escape helper | `src/lib/email/escape.ts` |
| Verification service | `src/lib/email/services/verification.ts` |
| Reset-password service | `src/lib/email/services/reset-password.ts` |
| Password-changed service | `src/lib/email/services/password-changed.ts` |

---

## Configuration

| Variable | Description |
|---|---|
| `SMTP_HOST` | e.g. `smtp.gmail.com` |
| `SMTP_PORT` | e.g. `587` (STARTTLS) or `465` (secure) |
| `SMTP_USER` | From address / SMTP username |
| `SMTP_PASS` | App password (not account login password) |

From header:

```
"inkcuba" <SMTP_USER>
```

---

## Email types

### 1) Email verification (after sign-up)

- Trigger: Better Auth `emailVerification.sendVerificationEmail`
- Subject: `Verify Your Email — inkcuba`
- Content: greeting, why verify, CTA button, 24h guidance
- HTML + plaintext versions
- Failure handling: logged + surfaced as delivery error

### 2) Password reset

- Trigger: Better Auth `emailAndPassword.sendResetPassword`
- Subject: `Reset Password — inkcuba`
- Content: greeting, security notice (1 hour expiry + sessions revoked), CTA
- HTML + plaintext versions

### 3) Password changed (My Settings)

- Trigger: after successful `changePassword`, client calls `POST /api/settings/password-changed`
- Subject: `Password Changed — inkcuba`
- Content: confirmation that the password was updated; other sessions signed out
- HTML + plaintext versions (`passwordChangedEmailTemplate` / `passwordChangedEmailText`)

### 4) Workspace invitations (People tab)

Queued via BullMQ (`workspace-invite-email`) and audited in `workspace_email_outbox`:

| Template | When | CTA |
|---|---|---|
| `INVITE_EXISTING` | Registered student who has logged in before (manual add / Excel) | Open workspace |
| `INVITE_REGISTERED_NO_LOGIN` | Account exists but never logged in | Set / reset password |
| `INVITE_ACTIVATE` | New account created from Excel/manual invite | `/auth/activate?token=…` (create password) |
| `WORKSPACE_JOINED` | Student joins via invite link or code | Go to workspace |

Services: `src/lib/email/services/workspace-invite.ts`. Worker: `npm run worker` / PM2 `inkcuba-worker`.

### Project moderation emails

Queued via BullMQ (`project-email`) and audited in `project_email_outbox`.

**Reliability rules**
- Outbox rows are inserted in the same DB transaction as submit/moderation state changes.
- BullMQ enqueue runs **after** the transaction commits (submit notifies post-commit; lecturer moderate collects outbox ids and dispatches after commit) so workers never race an uncommitted row.
- Custom BullMQ job ids must **not** contain `:` (BullMQ forbids it). Ids use hyphen form such as `project-email-{outboxId}` / `invite-email-{outboxId}`.
- If Redis enqueue fails, the outbox stays `PENDING`. The worker runs an outbox recovery sweep on startup and every ~60s to re-queue stale `PENDING` / retryable `FAILED` rows (attempt cap 5).
- Email send failures never roll back submit/moderation.
- Invite emails from Excel import are also outbox-backed: bulk commits enqueue one job per recipient; recovery covers Redis blips the same way.

| Template | When | Audience |
|---|---|---|
| `PROJECT_SUBMITTED_STUDENT` | Student submits (`SUBMITTED`) or resubmits after revision (`REVISED`) | Every portfolio contributor (all group members for group slots) |
| `PROJECT_SUBMITTED_LECTURER` | Same moment | Workspace lecturer (Scoring deep link to that project) |
| `PROJECT_REVISION_REQUESTED` | Lecturer requests revision (journey stage; max 2 rounds) | Every contributor; plain-text feedback + revision round X of 2 |
| `PROJECT_PUBLISHED` (`audience: student`) | Lecturer publishes (journey stage) | Every contributor (score + optional note + scoring sheet mention) |
| `PROJECT_PUBLISHED` (`audience: lecturer`) | Same publish | Workspace lecturer confirmation (Scoring deep link) |

One email per meaningful stage transition only (submit/resubmit, revision requested, published). No emails for opening review or draft saves. Payload fields include `eventKind` (`SUBMITTED`\|`REVISED`), `audience` (`student`\|`lecturer`), optional `journeyStage`, and `scoringSheetAvailable`. HTML templates use the shared responsive `buildEmailLayout` (mobile media queries, branded card meta, escaped dynamic text). Service: `src/lib/email/services/project-notify.ts`.

---

## Template design guidelines (current)

- Responsive table layout (email-client safe)
- Brand logo from Cloudinary (`brandAssets.emailLogoUrl`)
  - Scaled with Cloudinary transforms
  - Rendered with `width` only + `height:auto` (prevents squashed logo)
  - No animation
- Neo-brutal card styling (border + offset shadow)
- Escaped dynamic user content (`escapeHtml`)
- Preheader text for inbox preview
- Footer with no-reply notice + site link

Brand config: `src/config/brand.ts`

---

## Delivery semantics

### Verification

- Required before login (`requireEmailVerification: true`)
- Sent automatically on registration
- After successful verification, Better Auth can auto sign-in (`autoSignInAfterVerification: true`)

### Password reset

- Request endpoint does not disclose account existence in UI messaging
- Token expires in 1 hour
- Successful reset revokes active sessions

---

## Health check

`checkEmailHealth()` verifies SMTP transport (`transporter.verify()`).  
Included in `/api/health?detailed=true` when authorized.

---

## Troubleshooting

| Symptom | Likely cause | Action |
|---|---|---|
| No email received | Wrong SMTP credentials / blocked App Password | Recheck `SMTP_*`, Gmail 2FA app password |
| Project/invite email stuck | Worker not running, or enqueue failed | Ensure `npm run worker` / PM2 `inkcuba-worker`; check logs for `Custom Id cannot contain :` (fixed — job ids must not use `:`) and `outbox recovery` |
| Outbox `PENDING` forever | Redis down at enqueue time | Worker recovery re-queues stale pending/failed rows automatically |
| Logo looks squashed | Forced square height/width in HTML | Keep `height:auto` + Cloudinary `c_scale` |
| Verification not required | Misconfigured Better Auth flags | Confirm `requireEmailVerification` |
| Reset link invalid | Expired token / wrong redirect URL | Request new link; confirm `NEXT_PUBLIC_APP_URL` |

---

## Next reading

- [03 — Authentication & Security](./03-authentication-security.md)
- [10 — User Manual](./10-user-manual.md)
