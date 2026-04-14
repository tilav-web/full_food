import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CategoriesModule } from '../categories/categories.module';
import { UploadsService } from '../uploads/uploads.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [AuthModule, CategoriesModule],
  controllers: [ProductsController],
  providers: [ProductsService, UploadsService],
})
export class ProductsModule {}
