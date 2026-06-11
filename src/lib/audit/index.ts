import "server-only";

import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { logger } from "@/lib/logger";

export type AuditLogInput = {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });
  } catch (error) {
    logger.error({ err: error, input }, "Failed to write audit log");
  }
}
