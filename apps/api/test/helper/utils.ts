import { JwtModule } from "@nestjs/jwt";
import { TestingModule } from "@nestjs/testing";
import { sql } from "drizzle-orm";
import { DbType } from "src/global/providers/db.provider";

import { schemas } from "@earthworm/schema";
import { GlobalModule } from "../../src/global/global.module";
import { LogtoService } from "../../src/logto/logto.service";

export async function cleanDB(db: DbType) {
  if (!db) return;

  await db.run(sql`PRAGMA foreign_keys = OFF;`);
  await db.delete(schemas.statement).execute();
  await db.delete(schemas.course).execute();
  await db.delete(schemas.coursePack).execute();
  await db.delete(schemas.userCourseProgress).execute();
  await db.delete(schemas.courseHistory).execute();
  await db.delete(schemas.userLearningActivities).execute();
  await db.delete(schemas.masteredElements).execute();
  await db.delete(schemas.membership).execute();
  await db.run(sql`PRAGMA foreign_keys = ON;`);
}

export async function signin(builder: TestingModule) {
  const logto = builder.get(LogtoService);
  return await logto.fetchToken();
}

export const testImportModules = [
  GlobalModule,
  JwtModule.register({
    secret: process.env.SECRET,
    signOptions: { expiresIn: "7d" },
  }),
];
