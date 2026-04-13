import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiWebBearerAuth } from '../docs/swagger.decorators';
import { StatisticsService } from './statistics.service';

@Controller('statistics')
@ApiTags('Statistics')
@Roles(Role.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiWebBearerAuth()
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard statistikasi' })
  getDashboardStats() {
    return this.statisticsService.getDashboardStats();
  }
}
