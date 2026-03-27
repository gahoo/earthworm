import path from "node:path";

import Database from "better-sqlite3";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/better-sqlite3";

import { schemas } from "@earthworm/schema";

const envName = process.env.NODE_ENV === "prod" ? ".env.prod" : ".env";
dotenv.config({ path: path.resolve(__dirname, `../../../apps/api/${envName}`) });

console.log("connection string: ", process.env.DATABASE_URL);
const connection = new Database(process.env.DATABASE_URL ?? "sqlite.db");

export const db = drizzle(connection, {
  schema: schemas,
});
