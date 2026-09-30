# inkcuba Documentation

Official documentation and user manual for **inkcuba** — a verified academic portfolio exhibition platform for BINUS University.

| | |
|---|---|
| **Product** | inkcuba |
| **Audience** | Developers, maintainers, operators, and end users |
| **Stack** | Next.js 16 · TypeScript · Better Auth · Drizzle ORM · PostgreSQL · Redis · SeaweedFS · Nodemailer |
| **Last updated** | August 2026 |

---

## Documentation map

| Document | Description |
|---|---|
| [01 — Product Overview](./01-product-overview.md) | Vision, goals, roles, and current feature status |
| [02 — Architecture](./02-architecture.md) | System design, folders, request flow, and infrastructure |
| [03 — Authentication & Security](./03-authentication-security.md) | Sign up, sign in, session, remember me, password reset, route guards |
| [04 — Database](./04-database.md) | Schema, enums, migrations, and seeding |
| [05 — Storage & Media](./05-storage-media.md) | SeaweedFS, avatar upload, media proxy |
| [06 — Email System](./06-email-system.md) | SMTP, verification, and reset-password templates |
| [07 — Pages & Features](./07-pages-features.md) | Public pages, auth pages, dashboards, UI components |
| [08 — API Reference](./08-api-reference.md) | HTTP endpoints, health check, auth API |
| [09 — Environment & Setup](./09-environment-setup.md) | Local setup, env vars, scripts, troubleshooting |
| [10 — User Manual](./10-user-manual.md) | Step-by-step guides for students, lecturers, and admins |

---

## Quick start (developers)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with database, Redis, SMTP, storage, and auth secrets

# 3. Apply database migrations
npm run db:migrate

# 4. (Optional) Seed an admin account
npm run db:seed-admin -- --email=admin@binus.ac.id --password=YourPass1 --name="Admin"

# 5. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Related project files

- Environment template: `.env.example`
- Database migrations: `drizzle/`
- Source code: `src/`
- Seed script: `scripts/seed-admin.ts`
