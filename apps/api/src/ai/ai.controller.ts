import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { AuthGuard } from '../guards/auth.guard';
import { User, UserEntity } from '../user/user.decorators';

@Controller('ai')
@UseGuards(AuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-course')
  async generateCourseViaAI(
    @User() user: UserEntity,
    @Body() body: {
      materialNames: string[],
      prompt?: string,
      provider?: string,
      apiKey?: string,
      apiBaseUrl?: string
    }
  ) {
    return this.aiService.generateCoursePack(
      user.userId,
      body.materialNames,
      body.prompt,
      body.provider,
      body.apiKey,
      body.apiBaseUrl
    );
  }
}
