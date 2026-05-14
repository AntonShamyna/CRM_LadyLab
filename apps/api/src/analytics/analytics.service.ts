import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

const countedStatuses = [OrderStatus.ON_ASSEMBLY, OrderStatus.AWAITING_PAYMENT, OrderStatus.CLOSED];

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(query: { period?: string; month?: string; year?: string }) {
    const { dateFilter, year, month } = this.getPeriod(query);
    const countedOrders = await this.prisma.order.findMany({
      where: { status: { in: countedStatuses }, createdAt: dateFilter },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    });

    const goodsRevenueKopecks = countedOrders.reduce(
      (sum, order) => sum + order.productsTotalAfterDiscountKopecks,
      0,
    );
    const deliveryRevenueKopecks = countedOrders.reduce((sum, order) => sum + order.deliveryPriceKopecks, 0);
    const costKopecks = countedOrders.reduce(
      (sum, order) =>
        sum +
        order.items.reduce(
          (itemSum, item) => itemSum + item.costPriceSnapshotKopecks * item.quantity,
          0,
        ),
      0,
    );

    const expensesWhere =
      query.period === 'year'
        ? { year }
        : {
            year,
            month,
          };

    const [returnsCount, expenses, newCustomersCount] = await Promise.all([
      this.prisma.order.count({ where: { status: OrderStatus.RETURNED, createdAt: dateFilter } }),
      this.prisma.expense.aggregate({ where: expensesWhere, _sum: { amountKopecks: true } }),
      this.prisma.customer.count({ where: { createdAt: dateFilter } }),
    ]);

    const repeatOrdersCount = await this.countRepeatOrders(countedOrders);
    const expensesKopecks = expenses._sum.amountKopecks ?? 0;
    const grossProfitKopecks = goodsRevenueKopecks - costKopecks;

    return {
      ordersCount: countedOrders.length,
      returnsCount,
      goodsRevenueKopecks,
      deliveryRevenueKopecks,
      totalToPayKopecks: goodsRevenueKopecks + deliveryRevenueKopecks,
      costKopecks,
      grossProfitKopecks,
      expensesKopecks,
      netProfitKopecks: grossProfitKopecks - expensesKopecks,
      averageCheckKopecks: countedOrders.length ? Math.round(goodsRevenueKopecks / countedOrders.length) : 0,
      newCustomersCount,
      repeatOrdersCount,
    };
  }

  async products(query: { period?: string; month?: string; year?: string }) {
    const { dateFilter } = this.getPeriod(query);
    const items = await this.prisma.orderItem.findMany({
      where: {
        order: {
          status: { in: countedStatuses },
          createdAt: dateFilter,
        },
      },
      select: {
        productNameSnapshot: true,
        quantity: true,
        lineTotalKopecks: true,
        costPriceSnapshotKopecks: true,
        orderId: true,
      },
    });

    const map = new Map<
      string,
      {
        productName: string;
        soldQuantity: number;
        salesKopecks: number;
        costKopecks: number;
        orderIds: Set<string>;
      }
    >();

    for (const item of items) {
      const current =
        map.get(item.productNameSnapshot) ??
        {
          productName: item.productNameSnapshot,
          soldQuantity: 0,
          salesKopecks: 0,
          costKopecks: 0,
          orderIds: new Set<string>(),
        };
      current.soldQuantity += item.quantity;
      current.salesKopecks += item.lineTotalKopecks;
      current.costKopecks += item.costPriceSnapshotKopecks * item.quantity;
      current.orderIds.add(item.orderId);
      map.set(item.productNameSnapshot, current);
    }

    return Array.from(map.values())
      .map((row) => ({
        productName: row.productName,
        soldQuantity: row.soldQuantity,
        salesKopecks: row.salesKopecks,
        costKopecks: row.costKopecks,
        profitKopecks: row.salesKopecks - row.costKopecks,
        ordersCount: row.orderIds.size,
      }))
      .sort((a, b) => b.profitKopecks - a.profitKopecks);
  }

  async customers(query: { period?: string; month?: string; year?: string }) {
    const { dateFilter } = this.getPeriod(query);
    return this.prisma.customer.findMany({
      where: { orders: { some: { status: { in: countedStatuses }, createdAt: dateFilter } } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        city: true,
        isBlacklisted: true,
        orders: {
          where: { status: { in: countedStatuses }, createdAt: dateFilter },
          select: { productsTotalAfterDiscountKopecks: true },
        },
      },
    });
  }

  async orders(query: { period?: string; month?: string; year?: string }) {
    const { dateFilter } = this.getPeriod(query);
    return this.prisma.order.findMany({
      where: { createdAt: dateFilter },
      orderBy: { createdAt: 'desc' },
      include: { customer: true, items: true },
    });
  }

  private getPeriod(query: { period?: string; month?: string; year?: string }) {
    const now = new Date();
    const year = Number(query.year ?? now.getFullYear());
    const month = Number(query.month ?? now.getMonth() + 1);

    if (query.period === 'year') {
      return {
        year,
        month,
        dateFilter: {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        } satisfies Prisma.DateTimeFilter,
      };
    }

    return {
      year,
      month,
      dateFilter: {
        gte: new Date(Date.UTC(year, month - 1, 1)),
        lt: new Date(Date.UTC(year, month, 1)),
      } satisfies Prisma.DateTimeFilter,
    };
  }

  private async countRepeatOrders(orders: { id: string; customerId: string; createdAt: Date }[]) {
    let count = 0;
    for (const order of orders) {
      const previous = await this.prisma.order.count({
        where: {
          customerId: order.customerId,
          status: { in: countedStatuses },
          createdAt: { lt: order.createdAt },
        },
      });
      if (previous > 0) {
        count += 1;
      }
    }
    return count;
  }
}
