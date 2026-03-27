import { createId } from "@paralleldrive/cuid2";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const masteredElements = sqliteTable("mastered_elements", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id").notNull(),
  content: text("content", { mode: "json" }).notNull(),
  masteredAt: integer("mastered_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});
