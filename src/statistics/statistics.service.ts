import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const MANUAL_REVENUE_KEYS = ['totalRevenue', 'todayRevenue'] as const;
type ManualRevenueKey = (typeof MANUAL_REVENUE_KEYS)[number];

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalOrders,
      todayOrders,
      activeOrders,
      totalUsers,
      totalProducts,
      totalCategories,
      revenueSettings,
      ordersByStatus,
      weeklyOrders,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({
        where: { createdAt: { gte: todayStart } },
      }),
      this.prisma.order.count({
        where: {
          status: { in: [OrderStatus.NEW, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.DELIVERING] },
        },
      }),
      this.prisma.user.count(),
      this.prisma.product.count(),
      this.prisma.category.count(),
      this.prisma.setting.findMany({
        where: { key: { in: [...MANUAL_REVENUE_KEYS] } },
      }),
      this.prisma.order.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: weekAgo } },
        select: { createdAt: true, totalPrice: true, paymentStatus: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const settingsMap = new Map(revenueSettings.map((s) => [s.key, s.value]));
    const totalRevenue = Number(settingsMap.get('totalRevenue') ?? 0);
    const todayRevenue = Number(settingsMap.get('todayRevenue') ?? 0);

    const statusCounts: Record<string, number> = {};
    for (const item of ordersByStatus) {
      statusCounts[item.status] = item._count.id;
    }

    // Group weekly orders by day
    const dailyStats: Array<{
      date: string;
      orders: number;
      revenue: number;
    }> = [];
    const dayMap = new Map<string, { orders: number; revenue: number }>();

    for (const order of weeklyOrders) {
      const dayKey = order.createdAt.toISOString().slice(0, 10);
      const existing = dayMap.get(dayKey) || { orders: 0, revenue: 0 };
      existing.orders += 1;
      if (order.paymentStatus === PaymentStatus.PAID) {
        existing.revenue += Number(order.totalPrice);
      }
      dayMap.set(dayKey, existing);
    }

    for (const [date, stats] of dayMap) {
      dailyStats.push({ date, ...stats });
    }

    return {
      overview: {
        totalOrders,
        todayOrders,
        activeOrders,
        totalUsers,
        totalProducts,
        totalCategories,
        totalRevenue,
        todayRevenue,
      },
      ordersByStatus: statusCounts,
      weeklyStats: dailyStats,
    };
  }

  async setRevenue(key: string, value: number) {
    if (!MANUAL_REVENUE_KEYS.includes(key as ManualRevenueKey)) {
      throw new BadRequestException(
        `Noto'g'ri kalit. Ruxsat etilganlar: ${MANUAL_REVENUE_KEYS.join(', ')}.`,
      );
    }
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException('Qiymat 0 yoki undan katta son bo`lishi kerak.');
    }

    await this.prisma.setting.upsert({
      where: { key },
      create: { key, value: String(value) },
      update: { value: String(value) },
    });

    return { key, value };
  }
}
