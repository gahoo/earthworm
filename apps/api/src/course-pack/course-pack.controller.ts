import { Controller, Get, Param, Post, Delete, Body, UseGuards } from "@nestjs/common";

import { AuthGuard, UncheckAuth } from "../guards/auth.guard";
import { User, UserEntity } from "../user/user.decorators";
import { CoursePackService } from "./course-pack.service";

@Controller("course-pack")
export class CoursePackController {
  constructor(private readonly coursePackService: CoursePackService) {}

  @UncheckAuth()
  @UseGuards(AuthGuard)
  @Get()
  async findAll(@User() user: UserEntity) {
    return await this.coursePackService.findAll(user.userId);
  }

  @UncheckAuth()
  @UseGuards(AuthGuard)
  @Get(":coursePackId")
  async findOne(@User() user: UserEntity, @Param("coursePackId") coursePackId: string) {
    return await this.coursePackService.findOneWithCourses(user.userId, coursePackId);
  }

  @UncheckAuth()
  @UseGuards(AuthGuard)
  @Get(":coursePackId/courses/:courseId")
  findCourse(
    @User() user: UserEntity,
    @Param("coursePackId") coursePackId: string,
    @Param("courseId") courseId: string,
  ) {
    return this.coursePackService.findCourse(user.userId, coursePackId, courseId);
  }

  @UncheckAuth()
  @UseGuards(AuthGuard)
  @Get(":coursePackId/courses/:courseId/next")
  findNextCourse(@Param("coursePackId") coursePackId: string, @Param("courseId") courseId: string) {
    return this.coursePackService.findNextCourse(coursePackId, courseId);
  }

  @UseGuards(AuthGuard)
  @Post(":coursePackId/courses/:courseId/complete")
  CompleteCourse(
    @User() user: UserEntity,
    @Param("coursePackId") coursePackId: string,
    @Param("courseId") courseId: string,
  ) {
    return this.coursePackService.completeCourse(user.userId, coursePackId, courseId);
  }

  @UseGuards(AuthGuard)
  @Post()
  async createCoursePack(@User() user: UserEntity, @Body() body: { title: string, description: string }) {
    return await this.coursePackService.createCoursePack(user.userId, body.title, body.description);
  }

  @UseGuards(AuthGuard)
  @Delete(':coursePackId')
  async deleteCoursePack(@User() user: UserEntity, @Param('coursePackId') coursePackId: string) {
    return await this.coursePackService.deleteCoursePack(user.userId, coursePackId);
  }

  @UseGuards(AuthGuard)
  @Get(':coursePackId/export')
  async exportCoursePack(@User() user: UserEntity, @Param('coursePackId') coursePackId: string) {
    return await this.coursePackService.exportCoursePack(user.userId, coursePackId);
  }

  @UseGuards(AuthGuard)
  @Post('import')
  async importCoursePack(@User() user: UserEntity, @Body() body: any) {
    return await this.coursePackService.importCoursePack(user.userId, body);
  }

  @UseGuards(AuthGuard)
  @Post(':coursePackId/courses')
  async createCourse(@User() user: UserEntity, @Param('coursePackId') coursePackId: string, @Body() body: { title: string, description?: string }) {
    return await this.coursePackService.createCourse(user.userId, coursePackId, body.title, body.description);
  }

  @UseGuards(AuthGuard)
  @Delete(':coursePackId/courses/:courseId')
  async deleteCourse(@User() user: UserEntity, @Param('coursePackId') coursePackId: string, @Param('courseId') courseId: string) {
    return await this.coursePackService.deleteCourse(user.userId, coursePackId, courseId);
  }

  @UseGuards(AuthGuard)
  @Post(':coursePackId/courses/:courseId')
  async updateCourse(@User() user: UserEntity, @Param('coursePackId') coursePackId: string, @Param('courseId') courseId: string, @Body() body: { title?: string, description?: string }) {
    return await this.coursePackService.updateCourse(user.userId, coursePackId, courseId, body);
  }
}
