# 01 — Product Overview

## What is inkcuba?

**inkcuba** is a verified academic portfolio and project showcase platform for **BINUS University**. It acts as an official exhibition hall where student work is submitted through lecturer-managed workspaces, reviewed by faculty, and published with institutional credibility.

### Core goals

1. Showcase verified BINUS student portfolios to the public.
2. Enforce institutional identity (`@binus.edu` / `@binus.ac.id`).
3. Support role-based workflows for students, lecturers, and admins.
4. Provide a secure, professional authentication and session model.
5. Integrate email, object storage, Redis, and health monitoring as production foundations.

---

## User roles

Aligned with the PRD (Student, Lecturer, Admin + public visitor):

| Role | How assigned | Purpose |
|---|---|---|
| **STUDENT** | Default for all public self-registration (`@binus.edu` or `@binus.ac.id`) | Student dashboard, My Settings, portfolio submission (planned) |
| **LECTURER** | Admin User Management / operator elevation | Review submissions, manage courses/workspaces (planned) |
| **ADMIN** | Seed script / Admin User Management | Platform operations: user management, moderation, audit, reporting |

Public visitors browse without an account.

**Self-registration always creates `STUDENT`.** Email domain no longer auto-promotes to lecturer. Admins are created via seed script, not public sign-up.

---

## Feature status matrix

### Implemented (live)

| Area | Status | Notes |
|---|---|---|
| Public landing / homepage | Done | Hero, portfolio showcase (mock), about, courses preview, team, BINUS social, CTA |
| Explore / Courses / Campus Stats pages | Done | Public browsing surfaces |
| Portfolio search dialog (⌘K) | Done | Client-side search over showcase data |
| Sign up / Sign in | Done | BINUS email + password only |
| Email verification | Done | Required before sign-in |
| Forgot / Reset password | Done | Token email + revoke sessions on reset |
| Remember me (device credentials) | Done | Separate from session expiry |
| Session (max 7 days) | Done | Better Auth cookie session |
| Route protection (auth ↔ dashboard) | Done | `proxy.ts` + server redirects |
| User menu dropdown | Done | Dashboard, settings, logout + confirm modal |
| Avatar upload (SeaweedFS) | Done | Upload on form submit only |
| Media proxy for private storage | Done | `/api/media/[...key]` |
| Dashboards (student / lecturer / admin) | Partial | Student + lecturer Workspaces live; portfolios Coming Soon |
| Lecturer Workspaces | Done (Phase 1+People) | Create/edit/list; soft-delete trash (30d purge); Info + People (manual/Excel/link/code invites + emails); Submission/Scoring Coming Soon |
| Student Workspaces | Done (join + list/detail tabs) | `/join` gate → sign-in → detail with Info / People (read-only) / Submission; list search/pagination |
| Public user profiles | Done | `/u/{binusianId|userId}` for students & lecturers; friendly share; People/lecturer cards link in |
| My Settings page | Done | Identity (RO), photo, public profile (+ view/copy public URL), password, 7-day login history |
| Admin console layout | Done | Edge-collapse sidebar, breadcrumbs, public-site shortcut |
| Admin User Management | Done | List/search/filter; edit role, activation, identity; soft delete + trash; audit writes |
| Admin Directory Options | Done | CRUD + drag-reorder, search/pagination for campus/major/batch/semester/department selects |
| Admin Field Permissions | Done | Per-role My Settings identity edit matrix |
| Admin user avatars | Done | Upload/replace/remove from User Management with SeaweedFS sync |
| Health check API | Done | Basic + detailed (token) |
| Redis rate limiting | Done | Auth + uploads + lecturer/student APIs |
| Email templates | Done | Verification + reset + password-changed + workspace invites |
| BullMQ worker + PM2 | Done | Import commit + invite email queues |
| Logging (Pino) | Done | Redacted secrets |

### Schema ready / UI not fully built yet

| Area | Status | Notes |
|---|---|---|
| Student / lecturer profiles | Done | My Settings + admin identity sync |
| Workspaces (lecturer Phase 1+People) | Done | Create/edit/list + Info + People members/import/join |
| Portfolios / media / reviews | Schema ready | Submission & review workflow planned |
| Audit logs | Schema ready | Audit helpers exist |

---

## Design language

- **Typography:** Plus Jakarta Sans (body), Space Grotesk (headings)
- **Visual style:** Neo-brutalism accents (`border-2 border-slate-900`, `shadow-inkcuba`)
- **Primary color:** Sky blue (`sky-500`)
- **Motion:** Framer Motion for intentional UI presence
- **Toasts:** Sonner, top-center
- **Components:** shadcn/ui + Radix primitives

---

## Institutional constraints

1. Registration and login require BINUS emails only.
2. No OAuth / Google / Firebase social login (Firebase removed).
3. Auth is form-based email + password via Better Auth.
4. Public exhibition content should represent faculty-verified work (workflow planned on top of existing schema).

---

## Next reading

- [02 — Architecture](./02-architecture.md)
- [10 — User Manual](./10-user-manual.md)
