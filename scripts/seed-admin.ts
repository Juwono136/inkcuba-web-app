import "dotenv/config";

import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "../src/db/schema";

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};

  for (const arg of args) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    if (key && value) parsed[key] = value;
  }

  return parsed;
}

async function main() {
  const args = parseArgs();
  const email = args.email;
  const password = args.password;
  const name = args.name ?? "Super Admin";
  const role = (args.role ?? "SUPER_ADMIN") as
    | "SUPER_ADMIN"
    | "ADMIN"
    | "LECTURER"
    | "STUDENT";

  if (!email || !password) {
    console.error(
      "Usage: npm run db:seed-admin -- --email=admin@binus.ac.id --password=YourPassword123 --name=\"Admin Name\"",
    );
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  const existing = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);

  const userId = existing[0]?.id ?? crypto.randomUUID();
  const hashedPassword = await hashPassword(password);

  if (existing.length === 0) {
    await db.insert(schema.user).values({
      id: userId,
      name,
      email,
      emailVerified: true,
      role,
      isActive: true,
    });
  } else {
    await db
      .update(schema.user)
      .set({ name, role, emailVerified: true, isActive: true })
      .where(eq(schema.user.id, userId));
  }

  const account = await db
    .select()
    .from(schema.account)
    .where(eq(schema.account.userId, userId))
    .limit(1);

  if (account.length === 0) {
    await db.insert(schema.account).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: hashedPassword,
    });
  } else {
    await db
      .update(schema.account)
      .set({ password: hashedPassword })
      .where(eq(schema.account.userId, userId));
  }

  console.log(`Admin user ready: ${email} (${role})`);
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
