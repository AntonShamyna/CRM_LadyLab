import { Injectable } from '@nestjs/common';
import { OrderStatus, ReminderStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);
    const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const nextMonthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));

    const countedStatuses = [OrderStatus.ON_ASSEMBLY, OrderStatus.AWAITING_PAYMENT, OrderStatus.CLOSED];

    const [dayOrders, monthOrders, queueOrders, reminders] = await Promise.all([
      this.prisma.order.findMany({
        where: { status: { in: countedStatuses }, createdAt: { gte: todayStart, lt: tomorrowStart } },
      }),
      this.prisma.order.findMany({
        where: { status: { in: countedStatuses }, createdAt: { gte: monthStart, lt: nextMonthStart } },
      }),
      this.prisma.order.findMany({
        where: { status: { in: [OrderStatus.ON_ASSEMBLY, OrderStatus.AWAITING_PAYMENT] } },
        include: { customer: true, items: true },
        orderBy: { createdAt: 'asc' },
        take: 20,
      }),
      this.prisma.reminder.findMany({
        where: {
          status: ReminderStatus.ACTIVE,
          remindAt: { gte: todayStart, lt: tomorrowStart },
        },
        include: {
          customer: { select: { id: true, firstName: true, lastName: true } },
          order: { select: { id: true, status: true } },
        },
        orderBy: { remindAt: 'asc' },
      }),
    ]);

    return {
      currentDate: now.toISOString(),
      revenueTodayKopecks: dayOrders.reduce((sum, order) => sum + order.productsTotalAfterDiscountKopecks, 0),
      revenueMonthKopecks: monthOrders.reduce((sum, order) => sum + order.productsTotalAfterDiscountKopecks, 0),
      queueOrders,
      reminders,
    };
  }
}
