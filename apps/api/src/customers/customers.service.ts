import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

const countedStatuses = [OrderStatus.ON_ASSEMBLY, OrderStatus.AWAITING_PAYMENT, OrderStatus.CLOSED];

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: { search?: string; city?: string; sort?: string; page?: string }) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const pageSize = 30;
    const where: Prisma.CustomerWhereInput = {
      city: query.city ? { contains: query.city, mode: 'insensitive' } : undefined,
      OR: query.search
        ? [
            { lastName: { contains: query.search, mode: 'insensitive' } },
            { firstName: { contains: query.search, mode: 'insensitive' } },
            { phone: { contains: query.search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const orderBy: Prisma.CustomerOrderByWithRelationInput =
      query.sort === 'alphabet'
        ? { lastName: 'asc' }
        : query.sort === 'city'
          ? { city: 'asc' }
          : { createdAt: 'desc' };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { orders: true } },
          orders: {
            where: { status: { in: countedStatuses } },
            select: { productsTotalAfterDiscountKopecks: true, createdAt: true },
          },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      items: items.map((customer) => ({
        ...customer,
        ordersCount: customer._count.orders,
        totalOrdersKopecks: customer.orders.reduce(
          (sum, order) => sum + order.productsTotalAfterDiscountKopecks,
          0,
        ),
        lastOrderAt: customer.orders
          .map((order) => order.createdAt)
          .sort((a, b) => b.getTime() - a.getTime())[0],
        orders: undefined,
        _count: undefined,
      })),
      total,
      page,
      pageSize,
    };
  }

  create(dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      },
    });
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new NotFoundException('Клиент не найден');
    }
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);
    return this.prisma.customer.update({
      where: { id },
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      },
    });
  }

  orders(id: string) {
    return this.prisma.order.findMany({
      where: { customerId: id },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  }

  async products(id: string) {
    await this.findOne(id);
    return this.prisma.orderItem.groupBy({
      by: ['productNameSnapshot'],
      where: {
        order: { customerId: id, status: { in: countedStatuses } },
      },
      _sum: { quantity: true, lineTotalKopecks: true },
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: 'desc' } },
    });
  }

  async statistics(id: string) {
    await this.findOne(id);
    const [orders, returns] = await Promise.all([
      this.prisma.order.findMany({
        where: { customerId: id, status: { in: countedStatuses } },
        select: { productsTotalAfterDiscountKopecks: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.order.count({ where: { customerId: id, status: OrderStatus.RETURNED } }),
    ]);

    const totalKopecks = orders.reduce((sum, order) => sum + order.productsTotalAfterDiscountKopecks, 0);
    return {
      ordersCount: orders.length,
      averageCheckKopecks: orders.length ? Math.round(totalKopecks / orders.length) : 0,
      totalKopecks,
      returnsCount: returns,
      firstOrderAt: orders[0]?.createdAt ?? null,
      lastOrderAt: orders[orders.length - 1]?.createdAt ?? null,
    };
  }
}
