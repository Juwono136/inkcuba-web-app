import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import {
  settingsIdentityFieldEnum,
  userRoleEnum,
} from "@/db/schema/enums";

/**
 * Per-role toggles for which identity fields a user may edit in My Settings.
 * Admin User Management can always edit all fields regardless of these flags.
 */
export const roleFieldPermission = pgTable(
  "role_field_permission",
  {
    id: text("id").primaryKey(),
    role: userRoleEnum("role").notNull(),
    field: settingsIdentityFieldEnum("field").notNull(),
    editableBySelf: boolean("editable_by_self").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("role_field_permission_role_field_uidx").on(
      table.role,
      table.field,
    ),
    index("role_field_permission_role_idx").on(table.role),
  ],
);
