import { Body, Controller, Post, UseGuards } from "@nestjs/common";

import { AuthGuard } from "../guards/auth.guard";
import { User, UserEntity } from "../user/user.decorators";
import { AiService } from "./ai.service";

@Controller("ai")
@UseGuards(AuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("generate-course")
  async generateCourseViaAI(
    @User() user: UserEntity,
    @Body()
    body: {
      materialNames?: string[];
      prompt?: string;
      provider?: string;
      apiKey?: string;
      apiBaseUrl?: string;
      model?: string;
    },
  ) {
    return this.aiService.generateCoursePack(
      user.userId,
      body.materialNames || [],
      body.prompt,
      body.provider,
      body.apiKey,
      body.apiBaseUrl,
      body.model,
    );
  }
}
