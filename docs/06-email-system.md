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
| Logo looks squashed | Forced square height/width in HTML | Keep `height:auto` + Cloudinary `c_scale` |
| Verification not required | Misconfigured Better Auth flags | Confirm `requireEmailVerification` |
| Reset link invalid | Expired token / wrong redirect URL | Request new link; confirm `NEXT_PUBLIC_APP_URL` |

---

## Next reading

- [03 — Authentication & Security](./03-authentication-security.md)
- [10 — User Manual](./10-user-manual.md)
