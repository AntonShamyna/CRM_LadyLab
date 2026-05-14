import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma, ReturnStockAction } from '@prisma/client';
import { RequestUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { allocateDiscountToLines, calculateTotals } from '../domain/order-calculations';
import { StockService } from '../stock/stock.service';
import { CreateOrderDto, ReturnOrderDto, StatusActionDto, UpdateOrderDto } from './dto/order.dto';

const countedStatuses = [OrderStatus.ON_ASSEMBLY, OrderStatus.AWAITING_PAYMENT, OrderStatus.CLOSED];
const orderInclude = {
  customer: true,
  items: { include: { product: true, batch: true } },
  statusHistory: { orderBy: { createdAt: 'desc' } },
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
  ) {}

  async list(query: { status?: OrderStatus; month?: string; year?: string; search?: string; page?: string }) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const pageSize = 30;
    const dateFilter = this.buildDateFilter(query.month, query.year);

    const where: Prisma.OrderWhereInput = {
      status: query.status,
      createdAt: dateFilter,
      customer: query.search
        ? {
            OR: [
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : undefined,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: orderInclude,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.order.count({ where }),
    ]);

    const priority: Record<OrderStatus, number> = {
      ON_ASSEMBLY: 1,
      AWAITING_PAYMENT: 2,
      CLOSED: 3,
      RETURNED: 4,
      CANCELLED: 5,
    };

    return {
      items: items.sort((a, b) => priority[a.status] - priority[b.status] || b.createdAt.getTime() - a.createdAt.getTime()),
      total,
      page,
      pageSize,
    };
  }

  async create(dto: CreateOrderDto, user: RequestUser) {
    const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
    if (!customer) {
      throw new NotFoundException('Клиент не найден');
    }

    const batches = await this.prisma.productBatch.findMany({
      where: { id: { in: dto.items.map((item) => item.batchId) } },
      include: { product: true },
    });
    const batchById = new Map(batches.map((batch) => [batch.id, batch]));

    const lines = dto.items.map((item) => {
      const batch = batchById.get(item.batchId);
      if (!batch) {
        throw new NotFoundException(`Партия ${item.batchId} не найдена`);
      }
      if (batch.productId !== item.productId) {
        throw new BadRequestException('Выбранная партия не принадлежит продукту');
      }

      return {
        item,
        batch,
        quantity: item.quantity,
        salePriceKopecks: batch.product.salePriceKopecks,
      };
    });

    const productsTotalKopecks = lines.reduce(
      (sum, line) => sum + line.quantity * line.salePriceKopecks,
      0,
    );
    const totals = calculateTotals(productsTotalKopecks, dto.discountPercent, dto.deliveryPriceKopecks);
    const discountedLineTotals = allocateDiscountToLines(lines, dto.discountPercent);

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customerId: dto.customerId,
          createdById: user.id,
          status: OrderStatus.ON_ASSEMBLY,
          deliveryService: dto.deliveryService,
          deliveryPriceKopecks: dto.deliveryPriceKopecks,
          paymentMethod: dto.paymentMethod,
          discountPercent: dto.discountPercent,
          comment: dto.comment,
          ...totals,
          items: {
            create: lines.map((line, index) => ({
              productId: line.batch.productId,
              batchId: line.batch.id,
              quantity: line.quantity,
              salePriceSnapshotKopecks: line.batch.product.salePriceKopecks,
              costPriceSnapshotKopecks: line.batch.costPriceKopecks,
              productNameSnapshot: line.batch.product.name,
              batchNumberSnapshot: line.batch.batchNumber,
              lineTotalKopecks: discountedLineTotals[index],
            })),
          },
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: OrderStatus.ON_ASSEMBLY,
              changedById: user.id,
              comment: 'Заказ создан',
            },
          },
        },
        include: orderInclude,
      });

      return { order, warnings: [] };
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });
    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }
    return order;
  }

  async update(id: string, dto: UpdateOrderDto) {
    const order = await this.findOne(id);
    if (order.status !== OrderStatus.ON_ASSEMBLY) {
      throw new BadRequestException('Редактировать можно только заказ на сборке');
    }

    const nextDelivery = dto.deliveryPriceKopecks ?? order.deliveryPriceKopecks;
    const nextDiscount = dto.discountPercent ?? order.discountPercent;
    const totals = calculateTotals(order.productsTotalKopecks, nextDiscount, nextDelivery);
    const discountedLineTotals = allocateDiscountToLines(
      order.items.map((item) => ({
        quantity: item.quantity,
        salePriceKopecks: item.salePriceSnapshotKopecks,
      })),
      nextDiscount,
    );

    return this.prisma.$transaction(async (tx) => {
      for (const [index, item] of order.items.entries()) {
        await tx.orderItem.update({
          where: { id: item.id },
          data: { lineTotalKopecks: discountedLineTotals[index] },
        });
      }

      return tx.order.update({
        where: { id },
        data: {
          deliveryService: dto.deliveryService,
          deliveryPriceKopecks: dto.deliveryPriceKopecks,
          paymentMethod: dto.paymentMethod,
          discountPercent: dto.discountPercent,
          comment: dto.comment,
          ...totals,
        },
        include: orderInclude,
      });
    });
  }

  async send(id: string, user: RequestUser, dto: StatusActionDto) {
    const order = await this.findOne(id);
    if (order.status !== OrderStatus.ON_ASSEMBLY) {
      throw new BadRequestException('Отправить можно только заказ на сборке');
    }

    const warnings = this.stock.getWarnings(order.items.map((item) => ({ quantity: item.quantity, batch: item.batch })));

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.stock.decrementBatches(
        tx,
        order.items.map((item) => ({ batchId: item.batchId, quantity: item.quantity })),
      );

      return tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.AWAITING_PAYMENT,
          sentAt: new Date(),
          statusHistory: {
            create: {
              fromStatus: OrderStatus.ON_ASSEMBLY,
              toStatus: OrderStatus.AWAITING_PAYMENT,
              changedById: user.id,
              comment: dto.comment ?? 'Заказ отправлен',
            },
          },
        },
        include: orderInclude,
      });
    });

    return { order: updated, warnings };
  }

  async paid(id: string, user: RequestUser, dto: StatusActionDto) {
    const order = await this.findOne(id);
    if (order.status !== OrderStatus.AWAITING_PAYMENT) {
      throw new BadRequestException('Оплатить можно только заказ, ожидающий оплаты');
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.CLOSED,
        paidAt: new Date(),
        statusHistory: {
          create: {
            fromStatus: OrderStatus.AWAITING_PAYMENT,
            toStatus: OrderStatus.CLOSED,
            changedById: user.id,
            comment: dto.comment ?? 'Заказ оплачен',
          },
        },
      },
      include: orderInclude,
    });
  }

  async returnOrder(id: string, user: RequestUser, dto: ReturnOrderDto) {
    const order = await this.findOne(id);
    if (order.status !== OrderStatus.AWAITING_PAYMENT) {
      throw new BadRequestException('Вернуть можно только заказ, ожидающий оплаты');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.stockAction === ReturnStockAction.RETURN_TO_STOCK) {
        await this.stock.incrementBatches(
          tx,
          order.items.map((item) => ({ batchId: item.batchId, quantity: item.quantity })),
        );
      }

      await tx.customer.update({
        where: { id: order.customerId },
        data: { isBlacklisted: true },
      });

      return tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.RETURNED,
          returnedAt: new Date(),
          returnStockAction: dto.stockAction,
          statusHistory: {
            create: {
              fromStatus: OrderStatus.AWAITING_PAYMENT,
              toStatus: OrderStatus.RETURNED,
              changedById: user.id,
              comment: dto.comment ?? 'Заказ возвращен',
            },
          },
        },
        include: orderInclude,
      });
    });
  }

  async cancel(id: string, user: RequestUser, dto: StatusActionDto) {
    const order = await this.findOne(id);
    const cancellableStatuses: OrderStatus[] = [OrderStatus.ON_ASSEMBLY, OrderStatus.AWAITING_PAYMENT];
    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException('Отменить можно только заказ на сборке или ожидающий оплаты');
    }

    return this.prisma.$transaction(async (tx) => {
      if (order.status === OrderStatus.AWAITING_PAYMENT) {
        await this.stock.incrementBatches(
          tx,
          order.items.map((item) => ({ batchId: item.batchId, quantity: item.quantity })),
        );
      }

      return tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          statusHistory: {
            create: {
              fromStatus: order.status,
              toStatus: OrderStatus.CANCELLED,
              changedById: user.id,
              comment: dto.comment ?? 'Заказ отменен',
            },
          },
        },
        include: orderInclude,
      });
    });
  }

  private buildDateFilter(month?: string, year?: string): Prisma.DateTimeFilter | undefined {
    if (!month && !year) {
      return undefined;
    }

    const parsedYear = Number(year ?? new Date().getFullYear());
    if (month) {
      const parsedMonth = Number(month) - 1;
      const start = new Date(Date.UTC(parsedYear, parsedMonth, 1));
      const end = new Date(Date.UTC(parsedYear, parsedMonth + 1, 1));
      return { gte: start, lt: end };
    }

    return {
      gte: new Date(Date.UTC(parsedYear, 0, 1)),
      lt: new Date(Date.UTC(parsedYear + 1, 0, 1)),
    };
  }
}
