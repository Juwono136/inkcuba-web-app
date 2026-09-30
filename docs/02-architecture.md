# 02 — Architecture

## High-level system

```
┌─────────────┐     ┌──────────────────────┐     ┌──────────────┐
│  Browser    │────▶│  Next.js App Router  │────▶│ PostgreSQL   │
│  (Client)   │◀────│  + proxy.ts guards   │◀────│ (Drizzle)    │
└─────────────┘     └──────────┬───────────┘     └──────────────┘
                               │
               ┌───────────────┼───────────────┐
               ▼               ▼               ▼
         ┌─────────┐    ┌──────────┐    ┌────────────┐
         │  Redis  │    │ SeaweedFS│    │ SMTP/Gmail │
         │ (rate)  │    │ (media)  │    │ (Nodemailer)│
         └─────────┘    └──────────┘    └────────────┘
```

### Runtime responsibilities

| Layer | Responsibility |
|---|---|
| **Next.js App Router** | Pages, layouts, server components, API routes |
| **proxy.ts** | Cookie-based route guards + security headers |
| **Better Auth** | Sessions, credentials, verification, password reset |
| **Drizzle + PostgreSQL** | Relational data model |
| **Redis** | Rate limiting for sensitive auth/upload endpoints |
| **SeaweedFS** | Object storage for avatars (and future portfolio media) |
| **Nodemailer** | Transactional email delivery |

---

## Source folder map

```
src/
├── app/                    # Routes (pages + API)
│   ├── api/
│   │   ├── auth/[...all]/ # Better Auth handler
│   │   ├── auth/avatar/    # Avatar upload/delete (registration)
│   │   ├── settings/       # Settings aggregate / profile / avatar / notify
│   │   ├── media/[...key]/# Authenticated storage proxy
│   │   └── health/         # Health checks
│   ├── auth/               # Sign-in, sign-up, forgot/reset password
│   ├── dashboard/
│   │   ├── (workspace)/    # Student/lecturer chrome (SiteHeader/Footer)
│   │   └── admin/          # AdminShell (sidebar + breadcrumbs)
│   ├── courses|explore|stats/
│   └── page.tsx            # Landing
├── components/
│   ├── admin/              # Admin console shell / sidebar / navbar
│   ├── auth/               # Auth forms + shell
│   ├── dashboard/          # Dashboard shell
│   ├── landing/            # Homepage sections
│   ├── layout/             # Header, footer, user menu
│   ├── settings/           # My Settings sections
│   ├── portfolio/          # Showcase cards
│   ├── providers/          # Query + session watcher
│   ├── search/             # ⌘K search dialog
│   └── ui/                 # Design-system primitives
├── config/                 # Env + site + brand + storage env
├── data/                   # Mock showcase datasets
├── db/                     # Drizzle client + schema
├── lib/
│   ├── admin/              # Admin nav + breadcrumbs helpers
│   ├── auth/               # Auth helpers, permissions, remember-me
│   ├── email/              # Templates + send services
│   ├── settings/           # Settings loaders + profile updates
│   ├── storage/            # SeaweedFS client + avatar helpers
│   ├── redis/              # Redis + rate limit
│   ├── validators/         # Zod schemas
│   └── api/                # Response/error helpers
├── proxy.ts                # Edge/proxy route protection
└── stores/                 # Zustand UI state
```

---

## Request flows

### Public page request

1. Browser hits `/`, `/explore`, etc.
2. `proxy.ts` applies security headers.
3. Server renders page (often static / ISR-friendly public content).

### Authenticated dashboard request

1. Browser hits `/dashboard/student`.
2. `proxy.ts` checks `inkcuba.session_token` cookie.
3. Missing cookie → redirect `/auth/sign-in?callbackUrl=...`.
4. Page also calls `requireRole([...])` for role enforcement.

### Guest-only auth pages

1. Browser hits `/auth/sign-in` (or sign-up / forgot / reset).
2. If session cookie exists → redirect to dashboard.
3. Page also calls `redirectIfAuthenticated()` on the server.

### Sign-up with avatar

1. Client validates form (Zod).
2. If photo selected → `POST /api/auth/avatar` uploads to SeaweedFS.
3. Client calls Better Auth `signUp.email`.
4. On failure after upload → delete uploaded object (rollback).
5. Server sends verification email (`sendOnSignUp`).

### Avatar display

1. User image may be:
   - Dicebear default URL (public), or
   - SeaweedFS URL (`STORAGE_ENDPOINT/.../avatars/...`)
2. UI resolves storage URLs to `/api/media/avatars/...`.
3. Media proxy fetches object with Basic Auth and streams to browser.

---

## Auth session model

- Cookie prefix: `inkcuba`
- Session cookie: `inkcuba.session_token`
- Max age: **7 days** (`SESSION_MAX_AGE_SECONDS`)
- Cookie cache: 5 minutes
- Password reset: revokes sessions (`revokeSessionsOnPasswordReset: true`)

**Remember me** does **not** control session length. It only stores encrypted email/password on the device for form autofill.

---

## Environment boundaries

| Config module | Scope |
|---|---|
| `src/config/env.ts` | Server secrets (DB, SMTP, Redis, Better Auth, health token) |
| `src/config/env-client.ts` | Public URLs only |
| `src/config/storage-env.ts` | Storage credentials (lazy, independent of full server env) |

---

## Build notes

- Production build uses `next build --webpack` because Better Auth currently has Turbopack compatibility constraints in this project.
- Favicon assets are generated via `npm run generate:favicon`.

---

## Next reading

- [03 — Authentication & Security](./03-authentication-security.md)
- [04 — Database](./04-database.md)
