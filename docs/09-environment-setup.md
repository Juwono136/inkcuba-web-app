# 09 — Environment & Setup

## Prerequisites

- Node.js 20+ recommended
- PostgreSQL
- Redis
- SeaweedFS (or compatible object storage endpoint)
- SMTP mailbox (Gmail App Password recommended for local/dev)

---

## Install & run

```bash
npm install
cp .env.example .env
# fill all required values in .env

npm run db:migrate
npm run dev
```

Production:

```bash
npm run build
npm start
```

> Build script uses webpack: `next build --webpack`.

---

## Environment variables

See `.env.example` for the canonical list.

### App

| Key | Purpose |
|---|---|
| `NODE_ENV` | `development` / `production` |
| `NEXT_PUBLIC_APP_URL` | App origin (auth redirects, reset links) |
| `NEXT_PUBLIC_SITE_URL` | Public site URL / metadata base |

### Database

| Key | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |

### Better Auth

| Key | Purpose |
|---|---|
| `BETTER_AUTH_SECRET` | Min 32 chars secret |
| `BETTER_AUTH_URL` | Auth base URL (usually same as app URL) |
| `AUTH_LOCKOUT_ENABLED` | Enable Redis auth rate limiting |

### Email

| Key | Purpose |
|---|---|
| `SMTP_HOST` | SMTP host |
| `SMTP_PORT` | Port (`587` or `465`) |
| `SMTP_USER` | SMTP username / from |
| `SMTP_PASS` | SMTP password / app password |

### Redis

| Key | Purpose |
|---|---|
| `REDIS_HOST` | Host |
| `REDIS_PORT` | Port |
| `REDIS_PASSWORD` | Password |

### Storage

| Key | Purpose |
|---|---|
| `STORAGE_AUTH_MODE` | `nginx-basic` or `s3` |
| `STORAGE_ENDPOINT` | Object storage endpoint |
| `STORAGE_BUCKET` | Bucket name |
| `STORAGE_REGION` | Region label |
| `USERNAME_STORAGE` | Auth username / access key |
| `PASSWORD_STORAGE` | Auth password / secret |

### Ops

| Key | Purpose |
|---|---|
| `LOG_LEVEL` | `debug` \| `info` \| `warn` \| `error` (production logs are JSON via pino; pretty-print only in development) |
| `HEALTH_CHECK_TOKEN` | Token for detailed health endpoint |

### Next.js `.env` gotcha

If a value contains `$`, escape it as `\$`. Next.js expands `$VAR` inside env files.

---

## NPM scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build (webpack) |
| `npm start` | Start production server |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate migrations |
| `npm run db:migrate` | Apply migrations |
| `npm run db:push` | Push schema (dev) |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:seed-admin` | Create admin user |
| `npm run generate:favicon` | Rebuild `icon.png` / `apple-icon.png` (PNG favicons; no `.ico`) |

---

## Seed admin

```bash
npm run db:seed-admin -- \
  --email=admin@binus.ac.id \
  --password='YourPass1' \
  --name='Platform Admin'
```

Password must satisfy strength rules (upper + lower + number, min 8).

---

## Local verification checklist

1. `npm run db:migrate` succeeds.
2. `GET /api/health` returns OK.
3. `GET /api/health?detailed=true` with token shows all checks green.
4. Sign-up with `@binus.edu` receives verification email.
5. Unverified login is blocked.
6. Verified login reaches role dashboard.
7. Avatar upload appears in SeaweedFS and renders via `/api/media/...`.
8. Forgot password email arrives and reset works.
9. Authenticated users cannot open `/auth/*` (except flows that intentionally redirect).
10. Guests cannot open `/dashboard/*`.
11. `npm run worker` (or `npm run dev` which starts web+worker) processes import/email queues.
12. Production: `npm run build` then `npm run pm2:start` runs `inkcuba-web` + `inkcuba-worker`.

### Dev scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Next.js + BullMQ worker via `concurrently` |
| `npm run dev:web` | Next.js only |
| `npm run worker` | BullMQ worker only |
| `npm run pm2:start` | Production PM2 (web + worker) |

Optional env: `WORKSPACE_IMPORT_MAX_ROWS` (default 2000), `WORKSPACE_IMPORT_CHUNK` (default 50).

---

## Common troubleshooting

| Problem | Fix |
|---|---|
| `column "campus" does not exist` | Run `npm run db:migrate` |
| Avatar broken on dashboard | Ensure storage up + media proxy works |
| Auth pages 500 during Fast Refresh | Restart `npm run dev` |
| Auth / API routes 404 while `/` still works | Stop server, delete `.next`, run `npm run dev` again (corrupted route cache) |
| No emails | Verify SMTP App Password and port |
| Rate limit 429 | Wait retry window or check Redis |
| Reset link invalid | Confirm `NEXT_PUBLIC_APP_URL` matches actual origin |

---

## Security hygiene

1. Do not commit `.env`.
2. Rotate `BETTER_AUTH_SECRET` and `HEALTH_CHECK_TOKEN` for production.
3. Use strong SMTP app passwords.
4. Keep Redis and storage endpoints private to the VPC/local network.
5. Prefer HTTPS in production (`useSecureCookies` enabled when `NODE_ENV=production`).

---

## Next reading

- [10 — User Manual](./10-user-manual.md)
- [02 — Architecture](./02-architecture.md)
