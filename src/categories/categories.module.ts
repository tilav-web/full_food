import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UploadsService } from '../uploads/uploads.service';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  imports: [AuthModule],
  controllers: [CategoriesController],
  providers: [CategoriesService, UploadsService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
