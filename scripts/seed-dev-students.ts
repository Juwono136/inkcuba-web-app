import "dotenv/config";

import { hashPassword } from "better-auth/crypto";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "../src/db/schema";

/**
 * Local-only student fixtures for workspace and submission testing.
 * Refuses production and any database that is not on this machine.
 * Re-running updates only these reserved accounts. It never converts
 * another role and never overwrites a NIM that already belongs to someone else.
 */

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const DEV_PASSWORD = "LocalDev1";
const DEV_CAMPUS = "BINUS @Kemanggisan";
const DEV_EMAIL_DOMAIN = "binus.edu";

const DEV_STUDENTS = [
  { email: "dev.student01@binus.edu", name: "Dev Student Adi", nim: "DEV260001" },
  { email: "dev.student02@binus.edu", name: "Dev Student Bima", nim: "DEV260002" },
  { email: "dev.student03@binus.edu", name: "Dev Student Citra", nim: "DEV260003" },
  { email: "dev.student04@binus.edu", name: "Dev Student Dewi", nim: "DEV260004" },
  { email: "dev.student05@binus.edu", name: "Dev Student Eka", nim: "DEV260005" },
  { email: "dev.student06@binus.edu", name: "Dev Student Fajar", nim: "DEV260006" },
  { email: "dev.student07@binus.edu", name: "Dev Student Gita", nim: "DEV260007" },
  { email: "dev.student08@binus.edu", name: "Dev Student Hadi", nim: "DEV260008" },
  { email: "dev.student09@binus.edu", name: "Dev Student Intan", nim: "DEV260009" },
  { email: "dev.student10@binus.edu", name: "Dev Student Joko", nim: "DEV260010" },
] as const;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function assertSafeToSeed(connectionString: string) {
  if (process.env.NODE_ENV === "production") {
    fail("Refusing to seed dummy students while NODE_ENV is production.");
  }

  let hostname = "";
  try {
    hostname = new URL(connectionString).hostname;
  } catch {
    fail("DATABASE_URL is not a valid connection string.");
  }

  if (!LOCAL_HOSTS.has(hostname)) {
    fail(
      `Refusing to seed dummy students. DATABASE_URL host "${hostname}" is not local. This script only runs against localhost.`,
    );
  }

  for (const student of DEV_STUDENTS) {
    const domain = student.email.split("@")[1];
    if (domain !== DEV_EMAIL_DOMAIN) {
      fail(`Reserved dummy email must use @${DEV_EMAIL_DOMAIN}.`);
    }
  }
}

function avatarUrl(nim: string) {
  return `https://api.dicebear.com/10.x/glyphs/svg?seed=${encodeURIComponent(nim)}`;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) fail("DATABASE_URL is required.");
  assertSafeToSeed(connectionString);

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  try {
    const emails = DEV_STUDENTS.map((student) => student.email);
    const nims = DEV_STUDENTS.map((student) => student.nim);
    const expectedNimByEmail = new Map<string, string>(
      DEV_STUDENTS.map((student) => [student.email, student.nim]),
    );

    const existingByEmail = await db
      .select({
        id: schema.user.id,
        email: schema.user.email,
        role: schema.user.role,
        nim: schema.user.nim,
      })
      .from(schema.user)
      .where(inArray(schema.user.email, emails));

    for (const row of existingByEmail) {
      const expectedNim = expectedNimByEmail.get(row.email);
      if (row.role !== "STUDENT") {
        fail(
          `Refusing to change ${row.email} because that account is ${row.role}, not a dummy student.`,
        );
      }
      if (row.nim && row.nim !== expectedNim) {
        fail(
          `Refusing to change ${row.email} because its NIM (${row.nim}) is not the reserved dummy NIM.`,
        );
      }
    }

    const nimOwners = await db
      .select({
        email: schema.user.email,
        nim: schema.user.nim,
      })
      .from(schema.user)
      .where(inArray(schema.user.nim, nims));

    for (const row of nimOwners) {
      if (!row.nim) continue;
      if (expectedNimByEmail.get(row.email) !== row.nim) {
        fail(
          `Refusing to seed ${row.nim}. It is already used by ${row.email}.`,
        );
      }
    }

    const [major] = await db
      .select({ value: schema.directoryOption.value })
      .from(schema.directoryOption)
      .where(
        and(
          eq(schema.directoryOption.category, "major"),
          eq(schema.directoryOption.isActive, true),
        ),
      )
      .orderBy(schema.directoryOption.sortOrder)
      .limit(1);

    const [batch] = await db
      .select({ value: schema.directoryOption.value })
      .from(schema.directoryOption)
      .where(
        and(
          eq(schema.directoryOption.category, "batch"),
          eq(schema.directoryOption.isActive, true),
        ),
      )
      .orderBy(schema.directoryOption.sortOrder)
      .limit(1);

    const passwordHash = await hashPassword(DEV_PASSWORD);
    const knownIds = new Map(existingByEmail.map((row) => [row.email, row.id]));

    await db.transaction(async (tx) => {
      for (const student of DEV_STUDENTS) {
        const userId = knownIds.get(student.email) ?? crypto.randomUUID();
        const profile = {
          name: student.name,
          email: student.email,
          emailVerified: true,
          role: "STUDENT" as const,
          nim: student.nim,
          campus: DEV_CAMPUS,
          isActive: true,
          deletedAt: null,
          image: avatarUrl(student.nim),
        };

        if (knownIds.has(student.email)) {
          await tx.update(schema.user).set(profile).where(eq(schema.user.id, userId));
        } else {
          await tx.insert(schema.user).values({ id: userId, ...profile });
        }

        const accounts = await tx
          .select({ id: schema.account.id })
          .from(schema.account)
          .where(
            and(
              eq(schema.account.userId, userId),
              eq(schema.account.providerId, "credential"),
            ),
          )
          .limit(1);

        if (accounts[0]) {
          await tx
            .update(schema.account)
            .set({ password: passwordHash, accountId: userId })
            .where(eq(schema.account.id, accounts[0].id));
        } else {
          await tx.insert(schema.account).values({
            id: crypto.randomUUID(),
            accountId: userId,
            providerId: "credential",
            userId,
            password: passwordHash,
          });
        }

        const profiles = await tx
          .select({
            id: schema.studentProfile.id,
            major: schema.studentProfile.major,
            batch: schema.studentProfile.batch,
          })
          .from(schema.studentProfile)
          .where(eq(schema.studentProfile.userId, userId))
          .limit(1);

        if (!profiles[0]) {
          await tx.insert(schema.studentProfile).values({
            id: crypto.randomUUID(),
            userId,
            major: major?.value ?? null,
            batch: batch?.value ?? null,
          });
        } else if (
          (major?.value && !profiles[0].major) ||
          (batch?.value && !profiles[0].batch)
        ) {
          await tx
            .update(schema.studentProfile)
            .set({
              ...(major?.value && !profiles[0].major ? { major: major.value } : {}),
              ...(batch?.value && !profiles[0].batch ? { batch: batch.value } : {}),
            })
            .where(eq(schema.studentProfile.id, profiles[0].id));
        }
      }
    });

    console.log("Local dummy students are ready. They are not added to a workspace.");
    console.log(`Shared password: ${DEV_PASSWORD}`);
    console.log("");
    for (const student of DEV_STUDENTS) {
      console.log(`${student.email}  ${student.nim}  ${student.name}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
