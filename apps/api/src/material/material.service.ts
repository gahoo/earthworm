import { Injectable, InternalServerErrorException, BadRequestException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MaterialService {
  private baseUploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    if (!fs.existsSync(this.baseUploadDir)) {
      fs.mkdirSync(this.baseUploadDir, { recursive: true });
    }
  }

  private getUserDir(userId: string) {
    const userDir = path.join(this.baseUploadDir, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    return userDir;
  }

  private getSafeFilePath(userId: string, filename: string) {
    const userDir = this.getUserDir(userId);
    // Path traversal mitigation
    const sanitizedFilename = path.basename(filename).replace(/[^a-zA-Z0-9.-]/g, '_');
    const fullPath = path.resolve(userDir, sanitizedFilename);

    if (!fullPath.startsWith(userDir)) {
        throw new BadRequestException('Invalid filename');
    }
    return fullPath;
  }

  async getMaterials(userId: string) {
    const userDir = this.getUserDir(userId);
    try {
      const files = fs.readdirSync(userDir);
      return files.map(file => {
        const stats = fs.statSync(path.join(userDir, file));
        return {
          id: file,
          name: file,
          size: stats.size,
          url: `/uploads/${userId}/${file}`,
          createdAt: stats.birthtime.toISOString(),
        };
      });
    } catch (e) {
      throw new InternalServerErrorException('Failed to read materials');
    }
  }

  async saveMaterial(userId: string, file: Express.Multer.File) {
    const safePath = this.getSafeFilePath(userId, file.originalname);
    try {
      fs.writeFileSync(safePath, file.buffer);
      const stats = fs.statSync(safePath);
      return {
        id: path.basename(safePath),
        name: path.basename(safePath),
        size: stats.size,
        url: `/uploads/${userId}/${path.basename(safePath)}`,
        createdAt: stats.birthtime.toISOString(),
      };
    } catch (e) {
      throw new InternalServerErrorException('Failed to save material');
    }
  }

  async deleteMaterial(userId: string, name: string) {
    const safePath = this.getSafeFilePath(userId, name);
    if (fs.existsSync(safePath)) {
      fs.unlinkSync(safePath);
      return { success: true };
    }
    throw new NotFoundException('Material not found');
  }

  async getMaterialPath(userId: string, name: string): Promise<string> {
    const safePath = this.getSafeFilePath(userId, name);
    if (!fs.existsSync(safePath)) {
      throw new NotFoundException(`Material ${name} not found`);
    }
    return safePath;
  }

  async readMaterialText(userId: string, name: string): Promise<string> {
    const safePath = this.getSafeFilePath(userId, name);
    if (!fs.existsSync(safePath)) {
      throw new NotFoundException(`Material ${name} not found`);
    }

    try {
      // Basic text extraction for now
      return fs.readFileSync(safePath, 'utf-8');
    } catch (e) {
      throw new InternalServerErrorException('Failed to read material content');
    }
  }
}
