import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, or } from "drizzle-orm";

import { course, coursePack, statement } from "@earthworm/schema";
import { CourseHistoryService } from "../course-history/course-history.service";
import { CourseService } from "../course/course.service";
import { DB, DbType } from "../global/providers/db.provider";
import { MembershipService } from "../membership/membership.service";

@Injectable()
export class CoursePackService {
  constructor(
    @Inject(DB) private db: DbType,
    private readonly courseService: CourseService,
    private readonly courseHistoryService: CourseHistoryService,
    private readonly membershipService: MembershipService,
  ) {}

  async findAll(userId?: string) {
    let result = [];

    const publicCoursePacks = await this.findAllPublicCoursePacks();
    result.push(...publicCoursePacks);

    if (userId) {
      const userIdOwnedCoursePacks = await this.findAllForUser(userId);
      result.push(...userIdOwnedCoursePacks);

      // 看看是不是创始会员
      // 是的话 需要去查所有课程包的 shareLevel 为 founder_only 的
      if (await this.membershipService.isFounderMembership(userId)) {
        const founderOnlyCoursePacks = await this.findFounderOnly();
        result.push(...founderOnlyCoursePacks);
      }
    }

    return result;
  }

  async findFounderOnly() {
    const coursePacks = await this.db.query.coursePack.findMany({
      orderBy: asc(coursePack.order),
      where: and(eq(coursePack.shareLevel, "founder_only")), // TODO 缺一个 shareLevel 的枚举类型
    });

    return coursePacks;
  }

  async findAllForUser(userId: string) {
    const userIdOwnedCoursePacks = await this.db.query.coursePack.findMany({
      orderBy: asc(coursePack.order),
      where: and(eq(coursePack.creatorId, userId), eq(coursePack.shareLevel, "private")),
    });

    return userIdOwnedCoursePacks;
  }

  async findAllPublicCoursePacks() {
    return await this.db.query.coursePack.findMany({
      orderBy: asc(coursePack.order),
      where: eq(coursePack.shareLevel, "public"),
    });
  }

  async findOne(coursePackId: string) {
    const result = await this.db.query.coursePack.findFirst({
      where: eq(coursePack.id, coursePackId),
    });

    if (!result) {
      throw new NotFoundException(`CoursePack with ID ${coursePackId} not found`);
    }

    return result;
  }

  async findOneWithCourses(userId: string, coursePackId: string) {
    const coursePackWithCourses = await this.findCoursePackWithCourses(coursePackId, userId);

    if (userId) {
      coursePackWithCourses.courses = await this.addCompletionCountsToCourses(
        userId,
        coursePackWithCourses.courses,
        coursePackId,
      );
    }

    return coursePackWithCourses;
  }

  private async findCoursePackWithCourses(coursePackId: string, userId: string) {
    const coursePackWithCourses = await this.db.query.coursePack.findFirst({
      where: and(eq(coursePack.id, coursePackId)),
      with: {
        courses: {
          orderBy: asc(course.order),
        },
      },
    });

    if (!coursePackWithCourses) {
      throw new NotFoundException(`CoursePack with ID ${coursePackId} not found`);
    }

    if (coursePackWithCourses.shareLevel === "private") {
      if (coursePackWithCourses.creatorId === userId) {
        return coursePackWithCourses;
      } else {
        throw new NotFoundException(`CoursePack with ID ${coursePackId} not found`);
      }
    } else if (coursePackWithCourses.shareLevel === "founder_only") {
      if (await this.membershipService.isFounderMembership(userId)) {
        return coursePackWithCourses;
      } else {
        throw new NotFoundException(`CoursePack with ID ${coursePackId} not found`);
      }
    } else {
      return coursePackWithCourses;
    }
  }

  private async addCompletionCountsToCourses(userId: string, courses: any[], coursePackId: string) {
    return await Promise.all(
      courses.map(async (course) => {
        const completionCount = await this.courseHistoryService.findCompletionCount(
          userId,
          coursePackId,
          course.id,
        );
        return {
          ...course,
          completionCount,
        };
      }),
    );
  }

  async findCourse(userId: string, coursePackId: string, courseId: string) {
    if (userId) {
      return await this.courseService.findWithUserProgress(coursePackId, courseId, userId);
    } else {
      return await this.courseService.find(coursePackId, courseId);
    }
  }

  async findNextCourse(coursePackId: string, courseId: string) {
    return await this.courseService.findNext(coursePackId, courseId);
  }

  async completeCourse(userId: string, coursePackId: string, courseId: string) {
    return await this.courseService.completeCourse(userId, coursePackId, courseId);
  }

  async createCoursePack(userId: string, title: string, description: string) {
    const packs = await this.db.query.coursePack.findMany({
      where: eq(coursePack.creatorId, userId)
    });

    const newCoursePack = await this.db.insert(coursePack).values({
      title,
      description,
      creatorId: userId,
      shareLevel: 'private',
      order: packs.length + 1
    }).returning();
    return newCoursePack[0];
  }

  async updateCoursePack(userId: string, coursePackId: string, title?: string, description?: string) {
    const cp = await this.findOne(coursePackId);
    if (cp.creatorId !== userId) {
      throw new NotFoundException(`CoursePack with ID ${coursePackId} not found`);
    }

    const updates: Partial<{ title: string, description: string }> = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;

    if (Object.keys(updates).length > 0) {
      await this.db.update(coursePack).set(updates).where(eq(coursePack.id, coursePackId));
    }

    return { success: true };
  }

  async deleteCoursePack(userId: string, coursePackId: string) {
    const cp = await this.findOne(coursePackId);
    if (cp.creatorId !== userId) {
      throw new NotFoundException(`CoursePack with ID ${coursePackId} not found`);
    }

    await this.db.delete(coursePack).where(eq(coursePack.id, coursePackId));
    await this.db.delete(course).where(eq(course.coursePackId, coursePackId));
    return { success: true };
  }

  async exportCoursePack(userId: string, coursePackId: string) {
    const cp = await this.findOneWithCourses(userId, coursePackId);
    if (cp.creatorId !== userId) {
      throw new NotFoundException(`CoursePack with ID ${coursePackId} not found`);
    }

    return {
      title: cp.title,
      description: cp.description,
      isFree: cp.isFree,
      cover: cp.cover,
      courses: cp.courses.map((c) => ({
        title: c.title,
        description: c.description || '',
      }))
    };
  }

  async importCoursePack(userId: string, data: any) {
    const newCp = await this.createCoursePack(userId, data.title || 'Imported Course', data.description || '');

    if (data.courses && Array.isArray(data.courses)) {
      for (const [index, c] of data.courses.entries()) {
        const rawContent = c.description || c.content || '';
        const parsedContent = typeof rawContent === 'object' ? JSON.stringify(rawContent) : rawContent;

        const newCourse = await this.db.insert(course).values({
          title: c.title,
          description: parsedContent,
          coursePackId: newCp.id,
          order: index + 1
        }).returning();

        let contentArr = [];
        try {
          contentArr = typeof rawContent === 'object' ? rawContent : JSON.parse(rawContent);
        } catch(e) {}

        if (Array.isArray(contentArr) && contentArr.length > 0) {
          const statementsToInsert = contentArr.map((item: any, i: number) => ({
            courseId: newCourse[0].id,
            order: i + 1,
            chinese: item.chinese || '',
            english: item.english || '',
            soundmark: item.soundmark || ''
          }));
          await this.db.insert(statement).values(statementsToInsert);
        }
      }
    }

    return newCp;
  }

  async createCourse(userId: string, coursePackId: string, title: string, description: string = '') {
    const cp = await this.findOne(coursePackId);
    if (cp.creatorId !== userId) {
      throw new NotFoundException(`CoursePack with ID ${coursePackId} not found`);
    }

    const currentCourses = await this.db.query.course.findMany({
      where: eq(course.coursePackId, coursePackId),
    });

    const newCourse = await this.db.insert(course).values({
      title,
      description,
      coursePackId,
      order: currentCourses.length + 1
    }).returning();

    // Parse description as JSON and insert into statements if valid
    let contentArr = [];
    try {
      contentArr = JSON.parse(description);
    } catch(e) {}

    if (Array.isArray(contentArr) && contentArr.length > 0) {
      const statementsToInsert = contentArr.map((item: any, index: number) => ({
        courseId: newCourse[0].id,
        order: index + 1,
        chinese: item.chinese || '',
        english: item.english || '',
        soundmark: item.soundmark || ''
      }));
      await this.db.insert(statement).values(statementsToInsert);
    }

    return newCourse[0];
  }

  async deleteCourse(userId: string, coursePackId: string, courseId: string) {
    const cp = await this.findOne(coursePackId);
    if (cp.creatorId !== userId) {
      throw new NotFoundException(`CoursePack with ID ${coursePackId} not found`);
    }

    await this.db.delete(course).where(and(eq(course.id, courseId), eq(course.coursePackId, coursePackId)));
    return { success: true };
  }

  async updateCourse(userId: string, coursePackId: string, courseId: string, data: { title?: string, description?: string }) {
    const cp = await this.findOne(coursePackId);
    if (cp.creatorId !== userId) {
      throw new NotFoundException(`CoursePack with ID ${coursePackId} not found`);
    }

    const updatedCourse = await this.db.update(course)
      .set(data)
      .where(and(eq(course.id, courseId), eq(course.coursePackId, coursePackId)))
      .returning();

    if (data.description !== undefined) {
      let contentArr = [];
      try {
        contentArr = JSON.parse(data.description);
      } catch(e) {}

      if (Array.isArray(contentArr)) {
        await this.db.delete(statement).where(eq(statement.courseId, courseId));
        if (contentArr.length > 0) {
          const statementsToInsert = contentArr.map((item: any, index: number) => ({
            courseId: courseId,
            order: index + 1,
            chinese: item.chinese || '',
            english: item.english || '',
            soundmark: item.soundmark || ''
          }));
          await this.db.insert(statement).values(statementsToInsert);
        }
      }
    }

    return updatedCourse[0];
  }
}
