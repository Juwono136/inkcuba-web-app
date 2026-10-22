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
         │ rate +  │    │ (media)  │    │ (Nodemailer)│
         │ BullMQ  │    └──────────┘    └────────────┘
         └────┬────┘
              │
              ▼
     ┌────────────────┐
     │ PM2 worker     │
     │ (BullMQ jobs)  │
     └────────────────┘
```

### Runtime responsibilities

| Layer | Responsibility |
|---|---|
| **Next.js App Router** | Pages, layouts, server components, API routes |
| **proxy.ts** | Cookie-based route guards + security headers |
| **Better Auth** | Sessions, credentials, verification, password reset |
| **Drizzle + PostgreSQL** | Relational data model |
| **Redis** | Rate limiting + BullMQ queues (import commit, invite emails) |
| **BullMQ worker** | Async Excel import chunks + retryable invite emails (`scripts/workspace-worker.ts`) |
| **PM2** | Production process manager for web + worker (`ecosystem.config.cjs`) |
| **SeaweedFS** | Object storage for avatars, workspace media, Excel imports |
| **Nodemailer** | Transactional email delivery |

---

## Source folder map

```
src/
├── app/                    # Routes (pages + API)
│   ├── api/
│   │   ├── auth/[...all]/ # Better Auth handler
│   │   ├── auth/avatar/    # Avatar upload/delete (registration)
│   │   ├── settings/       # Settings aggregate / profile / avatar / login-history / notify
│   │   ├── media/[...key]/# Authenticated storage proxy
│   │   └── health/         # Health checks
│   ├── auth/               # Sign-in, sign-up, forgot/reset password
│   ├── dashboard/
│   │   ├── (workspace)/    # Student/lecturer: SiteHeader + collapsible sidebar
│   │   └── admin/          # AdminShell (brand console)
│   ├── courses|explore|stats/
│   └── page.tsx            # Landing
├── components/
│   ├── admin/              # Admin console shell / sidebar / navbar
│   ├── workspace/          # Student/lecturer shell / sidebar / navbar
│   ├── auth/               # Auth forms + shell
│   ├── dashboard/          # Dashboard page header
│   ├── landing/            # Homepage sections
│   ├── layout/             # Header, footer, user menu, scroll-to-top
│   ├── settings/           # My Settings sections
│   ├── portfolio/          # Showcase cards
│   ├── providers/          # Query + session watcher + global scroll-up
│   ├── search/             # ⌘K search dialog
│   └── ui/                 # Design-system primitives
├── config/                 # Env + site + brand + storage env
├── data/                   # Mock showcase datasets
├── db/                     # Drizzle client + schema
├── lib/
│   ├── admin/              # Admin nav, breadcrumbs, user-management service
│   ├── workspace/          # Student/lecturer nav + breadcrumbs
│   ├── auth/               # Auth helpers, permissions, remember-me, login-history
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

### Sign-up with default avatar

1. Client validates form (Zod).
2. Client calls Better Auth `signUp.email` with a generated Dicebear `image` URL (no SeaweedFS upload at registration).
3. Server forces `role = STUDENT` and sends verification email (`sendOnSignUp`).
4. User must verify email before sign-in (`requireEmailVerification` + `autoSignIn: false`).

Profile photos are uploaded later via **My Settings** → `/api/settings/avatar`.

### My Settings (public profile)

Students and lecturers edit public profile fields via `PATCH /api/settings/profile`:

- Bio is authored with TipTap (`RichTextEditor`): StarterKit with **heading levels 1–3**, **built-in Link disabled** (`link: false`) plus one configured `@tiptap/extension-link` to avoid duplicate-extension warnings.
- Toolbar actions preserve editor selection (`onMouseDown` preventDefault) so headings/bold/italic/lists/links work reliably.
- Server sanitizes bio HTML (`src/lib/settings/sanitize-bio.ts`) before persist (allowlist includes `h1`/`h2`/`h3`).
- UI confirms save and destructive removals (skills / filled custom links).
- Bio plain-text limit is **8000** characters; custom links store up to **4** `{ label, url }` entries in `portfolio_links` jsonb.

### Login history

On every successful Better Auth session create, `databaseHooks.session.create.after` writes a `login_history` row (IP + user agent). My Settings loads the last **7 days** via `GET /api/settings/login-history` (paginated; older rows pruned on read).

### Admin User Management

1. ADMIN-only APIs under `/api/admin/users` list, patch (`role` / `isActive`), soft-delete, restore, and hard-delete.
2. Soft-deleted rows keep `deleted_at` for **30 days**; list reads opportunistically purge expired trash.
3. Hard delete removes the DB user (cascades) and best-effort deletes SeaweedFS avatar keys.
4. `session.create.before` blocks inactive or soft-deleted accounts from signing in.
5. Mutations write `audit_log` entries (`user.update`, `user.soft_delete`, `user.restore`, `user.hard_delete`).

### Avatar display

1. User image may be:
   - Dicebear default URL (public), or
   - SeaweedFS URL (`STORAGE_ENDPOINT/.../avatars/...`)
2. UI resolves storage URLs to `/api/media/avatars/...`.
3. Media proxy fetches object with Basic Auth and streams to browser.
4. After My Settings photo upload/delete, the client:
   - broadcasts an optimistic image patch (`notifySessionUserUpdated`)
   - refetches session with `disableCookieCache: true` (cookie cache is 5 minutes)
   - calls `router.refresh()` so RSC layouts pick up the new `user.image`
5. Admin navbar and public `AuthNavActions` consume `useLiveSessionUser` (props + optimistic event; no `useSession` inside the hook — avoids SSR invalid-hook-call in the admin shell).

---

## Process singletons (traffic + HMR safety)

Long-lived Node resources are stored on `globalThis` so Next.js hot reload and multi-import paths do not multiply connections or stream listeners:

| Resource | Module | Notes |
|---|---|---|
| Pino logger | `src/lib/logger` | Dev uses `pino-pretty`; production emits JSON. Singleton prevents `MaxListenersExceededWarning` on `stdout`. |
| Redis | `src/lib/redis/client` | One `ioredis` client per process; used for auth/settings rate limits. |
| Postgres pool | `src/db` | Shared `pg` Pool (max 20) + Drizzle client. |

Under production traffic: prefer horizontal app instances behind a load balancer; keep Redis/Postgres as shared backends; never recreate logger/redis/db pools per request.

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
- Favicon assets are generated via `npm run generate:favicon` (`app/icon.png` + `apple-icon.png`; PNG-only to avoid libvips/ICO warnings on Windows).

---

## Next reading

- [03 — Authentication & Security](./03-authentication-security.md)
- [04 — Database](./04-database.md)
