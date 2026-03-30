import { Test, TestingModule } from "@nestjs/testing";
import { eq } from "drizzle-orm";

import { users } from "@earthworm/schema";
import { insertCourse, insertCoursePack } from "../../../test/fixture/db";
import { cleanDB, testImportModules } from "../../../test/helper/utils";
import { endDB } from "../../common/db";
import { DB, DbType } from "../../global/providers/db.provider";
import { MembershipService } from "../../membership/membership.service";
import { UserCourseProgressService } from "../../user-course-progress/user-course-progress.service";
import { UserService } from "../user.service";

describe("UserService", () => {
  let db: DbType;
  let userService: UserService;
  let membershipServiceMock: jest.Mocked<MembershipService>;
  let userCourseProgressServiceMock: jest.Mocked<UserCourseProgressService>;

  beforeAll(async () => {
    const testHelper = await setupTesting();
    db = testHelper.db;
    userService = testHelper.userService;
    membershipServiceMock = testHelper.membershipService as jest.Mocked<MembershipService>;
    userCourseProgressServiceMock =
      testHelper.userCourseProgressService as jest.Mocked<UserCourseProgressService>;
  });

  afterAll(async () => {
    await cleanDB(db);
    await endDB();
  });

  beforeEach(async () => {
    await cleanDB(db);
    jest.clearAllMocks();
  });

  async function createUserInDb(id: string, username: string) {
    const [user] = await db.insert(users).values({ id, username }).returning();
    return user;
  }

  describe("findUser", () => {
    it("should return user info with membership details", async () => {
      const userId = "testUserId";
      const dbUser = await createUserInDb(userId, "Test User");

      const membershipDetails = {
        type: "founder",
        startDate: new Date(),
        endDate: new Date(),
        isActive: true,
      };

      membershipServiceMock.isMember.mockResolvedValue(true);
      membershipServiceMock.getMembershipDetails.mockResolvedValue(membershipDetails);

      const result = await userService.findUser(userId);

      expect(result).toMatchObject({
        ...dbUser,
        membership: {
          isMember: true,
          details: membershipDetails,
        },
      });
    });

    it("should return undefined if user not found", async () => {
      const userId = "nonExistentUserId";
      const result = await userService.findUser(userId);
      expect(result).toBeUndefined();
    });
  });

  describe("findCurrentUser", () => {
    it("should return membership info for current user", async () => {
      const userId = "testUserId";
      const dbUser = await createUserInDb(userId, "Test User");

      const membershipDetails = {
        type: "founder",
        startDate: new Date(),
        endDate: new Date(),
        isActive: true,
      };

      membershipServiceMock.isMember.mockResolvedValue(true);
      membershipServiceMock.getMembershipDetails.mockResolvedValue(membershipDetails);

      const result = await userService.findCurrentUser(userId);

      expect(result).toMatchObject({
        ...dbUser,
        membership: {
          isMember: true,
          details: membershipDetails,
        },
      });
    });

    it("should return undefined if user not found", async () => {
      const userId = "testUserId";
      const result = await userService.findCurrentUser(userId);
      expect(result).toBeUndefined();
    });
  });

  describe("setupNewUser", () => {
    it("should setup a new user with provided username and avatar", async () => {
      const user = await createUserInDb("newUserId", "oldUsername");
      const dto = { username: "newUser", avatar: "custom-avatar.png" };

      const coursePackEntity = await insertCoursePack(db);
      const courseEntity = await insertCourse(db, coursePackEntity.id);

      const result = await userService.setupNewUser({ userId: user.id }, dto);

      expect(result).toEqual({
        avatar: dto.avatar,
        username: dto.username,
      });

      const updatedUser = await db.query.users.findFirst({ where: eq(users.id, user.id) });
      expect(updatedUser?.username).toBe(dto.username);
      expect(updatedUser?.avatar).toBe(dto.avatar);

      expect(userCourseProgressServiceMock.upsert).toHaveBeenCalledWith(
        user.id,
        coursePackEntity.id,
        courseEntity.id,
        0,
      );
    });

    it("should use default avatar if not provided", async () => {
      const user = await createUserInDb("newUserId", "oldUsername");
      const dto = { username: "newUser", avatar: "" };

      jest.spyOn(userService as any, "getRandomNumber").mockReturnValue(5); // 模拟随机数

      const coursePackEntity = await insertCoursePack(db);
      const courseEntity = await insertCourse(db, coursePackEntity.id);

      const result = await userService.setupNewUser({ userId: user.id }, dto);

      const expectedAvatar =
        "https://earthworm-prod-1312884695.cos.ap-beijing.myqcloud.com/avatars/avatar5.png";
      expect(result).toEqual({
        avatar: expectedAvatar,
        username: dto.username,
      });

      const updatedUser = await db.query.users.findFirst({ where: eq(users.id, user.id) });
      expect(updatedUser?.username).toBe(dto.username);
      expect(updatedUser?.avatar).toBe(expectedAvatar);

      expect(userCourseProgressServiceMock.upsert).toHaveBeenCalledWith(
        user.id,
        coursePackEntity.id,
        courseEntity.id,
        0,
      );
    });
  });
});

async function setupTesting() {
  const membershipServiceMock = {
    isMember: jest.fn(),
    getMembershipDetails: jest.fn(),
  };
  const userCourseProgressServiceMock = {
    upsert: jest.fn(),
  };

  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: testImportModules,
    providers: [
      UserService,
      { provide: MembershipService, useValue: membershipServiceMock },
      { provide: UserCourseProgressService, useValue: userCourseProgressServiceMock },
    ],
  }).compile();

  return {
    db: moduleRef.get<DbType>(DB),
    userService: moduleRef.get<UserService>(UserService),
    membershipService: moduleRef.get<MembershipService>(MembershipService),
    userCourseProgressService: moduleRef.get<UserCourseProgressService>(UserCourseProgressService),
  };
}
