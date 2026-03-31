import { TestingModule } from "@nestjs/testing";
import { UserEntity } from "../../src/user/user.decorators";
import { DB, DbType } from "../../src/global/providers/db.provider";
import { users } from "@earthworm/schema";
import { eq } from "drizzle-orm";

export function createUser(): UserEntity {
  return {
    userId: "123456",
  };
}

export const getTokenOwner = () => "test-user-id";

export async function createLogtoUser(builder: TestingModule, username: string) {
  const db: DbType = builder.get(DB);

  await db.delete(users).where(eq(users.username, username));

  const [user] = await db.insert(users).values({
    username,
  }).returning();

  return { userId: user.id, username };
}
