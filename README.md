# inkcuba

Verified academic portfolio exhibition platform for **BINUS University**.

Built with Next.js 16, Better Auth, Drizzle ORM, PostgreSQL, Redis, SeaweedFS, and Nodemailer.

## Documentation

Full product docs, technical references, and user manual:

**→ [`docs/README.md`](./docs/README.md)**

| Doc | Contents |
|---|---|
| [Product Overview](./docs/01-product-overview.md) | Vision, roles, feature status |
| [Architecture](./docs/02-architecture.md) | System design & folder map |
| [Auth & Security](./docs/03-authentication-security.md) | Login, session, reset password |
| [Database](./docs/04-database.md) | Schema & migrations |
| [Storage & Media](./docs/05-storage-media.md) | SeaweedFS avatars & proxy |
| [Email](./docs/06-email-system.md) | Verification & reset templates |
| [Pages & Features](./docs/07-pages-features.md) | UI surfaces |
| [API Reference](./docs/08-api-reference.md) | Endpoints |
| [Environment & Setup](./docs/09-environment-setup.md) | Local/prod setup |
| [User Manual](./docs/10-user-manual.md) | End-user how-to guides |

## Quick start

```bash
npm install
cp .env.example .env
# configure DATABASE_URL, Better Auth, SMTP, Redis, Storage

npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev
npm run build
npm start
npm run db:migrate
npm run db:seed-admin -- --email=admin@binus.ac.id --password=YourPass1 --name="Admin"
```
