import { createId } from "@paralleldrive/cuid2";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const membership = sqliteTable("memberships", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id").notNull(),
  start_date: integer("start_date", { mode: "timestamp" }).notNull(),
  end_date: integer("end_date", { mode: "timestamp" }).notNull(),
  isActive: integer("isActive", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$onUpdateFn(() => new Date()),
  type: text("type").notNull().default("regular"), // 先用 string 的形式， 后面需要改成枚举
});
