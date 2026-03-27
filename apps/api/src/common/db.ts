import { Logger } from "@nestjs/common";
import Database from "better-sqlite3";
import { DefaultLogger, LogWriter } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";

import { schemas } from "@earthworm/schema";

let connection: Database.Database;

async function createConnection() {
  return new Database(process.env.DATABASE_URL ?? "sqlite.db");
}

export async function endDB() {
  if (connection) {
    connection.close();
    connection = null as any;
  }
}

export async function setupDB() {
  if (connection) return;

  const logger = new Logger("DB");

  class CustomDbLogWriter implements LogWriter {
    write(message: string) {
      logger.verbose(message);
    }
  }

  logger.debug(`Connecting to ${process.env.DATABASE_URL}`);
  logger.debug(`SECRET: ${process.env.SECRET}`);

  connection = await createConnection();

  return drizzle(connection, {
    schema: schemas,
    logger: new DefaultLogger({ writer: new CustomDbLogWriter() }),
  });
}
