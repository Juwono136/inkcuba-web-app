import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "@/db/schema/auth";

/**
 * Durable login events for My Settings → Login History (last 7 days).
 * Survives session revoke/expiry so users can still audit recent sign-ins.
 */
export const loginHistory = pgTable(
  "login_history",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sessionId: text("session_id"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("login_history_user_id_idx").on(table.userId),
    index("login_history_created_at_idx").on(table.createdAt),
    index("login_history_user_created_idx").on(table.userId, table.createdAt),
    index("login_history_session_id_idx").on(table.sessionId),
  ],
);
