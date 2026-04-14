import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { join, extname } from 'path';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

@Injectable()
export class UploadsService {
  constructor(private readonly configService: ConfigService) {}

  async saveImage(file: Express.Multer.File): Promise<{ url: string }> {
    await mkdir(UPLOADS_DIR, { recursive: true });

    const ext = extname(file.originalname) || '.png';
    const filename = `${randomUUID()}${ext}`;
    const filePath = join(UPLOADS_DIR, filename);

    await writeFile(filePath, file.buffer);

    const serverUrl = this.configService.get<string>('SERVER_URL', '');
    const relativePath = `/uploads/${filename}`;

    return {
      url: serverUrl ? `${serverUrl}${relativePath}` : relativePath,
    };
  }
}
