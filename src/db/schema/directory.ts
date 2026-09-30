import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { directoryOptionCategoryEnum } from "@/db/schema/enums";

/**
 * Admin-managed selectable values for institutional identity fields
 * (campus, major, batch, semester, department).
 */
export const directoryOption = pgTable(
  "directory_option",
  {
    id: text("id").primaryKey(),
    category: directoryOptionCategoryEnum("category").notNull(),
    label: text("label").notNull(),
    value: text("value").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("directory_option_category_value_uidx").on(
      table.category,
      table.value,
    ),
    index("directory_option_category_idx").on(table.category),
    index("directory_option_active_idx").on(table.isActive),
    index("directory_option_sort_idx").on(table.category, table.sortOrder),
  ],
);
