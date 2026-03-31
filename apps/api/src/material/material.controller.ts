import { Controller, Get, Post, Delete, Param, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MaterialService } from './material.service';
import { AuthGuard } from '../guards/auth.guard';
import { User, UserEntity } from '../user/user.decorators';

@Controller('materials')
@UseGuards(AuthGuard)
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  @Get()
  async getMaterials(@User() user: UserEntity) {
    return this.materialService.getMaterials(user.userId);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadMaterial(@User() user: UserEntity, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // 20MB limit
    if (file.size > 20 * 1024 * 1024) {
      throw new BadRequestException('File is too large');
    }

    return this.materialService.saveMaterial(user.userId, file);
  }

  @Delete(':name')
  async deleteMaterial(@User() user: UserEntity, @Param('name') name: string) {
    return this.materialService.deleteMaterial(user.userId, name);
  }
}
