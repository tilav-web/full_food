import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiWebBearerAuth } from '../docs/swagger.decorators';
import { SetRevenueDto } from './dto/set-revenue.dto';
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

  @Patch('revenue/:key')
  @ApiOperation({
    summary: "Dashboarddagi daromad kartochkasini qo'lda o'zgartirish",
    description: "`key` sifatida faqat `totalRevenue` yoki `todayRevenue` qabul qilinadi.",
  })
  @ApiParam({ name: 'key', example: 'todayRevenue' })
  setRevenue(@Param('key') key: string, @Body() dto: SetRevenueDto) {
    return this.statisticsService.setRevenue(key, dto.value);
  }
}
