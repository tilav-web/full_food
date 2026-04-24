import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import {
  OPTIMIZED_IMAGE_EXTENSION,
  optimizeImageBuffer,
} from './image-optimizer';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

@Injectable()
export class UploadsService {
  constructor(private readonly configService: ConfigService) {}

  async saveImage(file: Express.Multer.File): Promise<{ url: string }> {
    await mkdir(UPLOADS_DIR, { recursive: true });

    const filename = `${randomUUID()}${OPTIMIZED_IMAGE_EXTENSION}`;
    const filePath = join(UPLOADS_DIR, filename);
    const optimizedImage = await optimizeImageBuffer(file.buffer);

    await writeFile(filePath, optimizedImage);

    const serverUrl = this.configService.get<string>('SERVER_URL', '');
    const relativePath = `/uploads/${filename}`;

    return {
      url: serverUrl ? `${serverUrl}${relativePath}` : relativePath,
    };
  }
}
