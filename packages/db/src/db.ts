import path from "node:path";

import Database from "better-sqlite3";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/better-sqlite3";

import { schemas } from "@earthworm/schema";

const envName = process.env.NODE_ENV === "prod" ? ".env.prod" : ".env";
dotenv.config({ path: path.resolve(__dirname, `../../../apps/api/${envName}`) });

let dbUrl = process.env.DATABASE_URL ?? "sqlite.db";
if (dbUrl === "sqlite.db") {
  dbUrl = path.resolve(__dirname, `../../../apps/api/sqlite.db`);
}

console.log("connection string: ", dbUrl);
const connection = new Database(dbUrl);

export const db = drizzle(connection, {
  schema: schemas,
});
