import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateBatchDto, CreateProductDto, UpdateBatchDto, UpdateProductDto } from './dto/product.dto';

const countedStatuses = [OrderStatus.ON_ASSEMBLY, OrderStatus.AWAITING_PAYMENT, OrderStatus.CLOSED];

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: { search?: string; aroma?: string; sort?: string; page?: string }) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const pageSize = 30;
    const where: Prisma.ProductWhereInput = {
      aroma: query.aroma ? { contains: query.aroma, mode: 'insensitive' } : undefined,
      OR: query.search
        ? [
            { name: { contains: query.search, mode: 'insensitive' } },
            { aroma: { contains: query.search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          batches: { orderBy: { expirationDate: 'asc' } },
          orderItems: {
            where: { order: { status: { in: countedStatuses } } },
            select: { quantity: true, lineTotalKopecks: true, costPriceSnapshotKopecks: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const mapped = items.map((product) => {
      const soldQuantity = product.orderItems.reduce((sum, item) => sum + item.quantity, 0);
      const salesKopecks = product.orderItems.reduce((sum, item) => sum + item.lineTotalKopecks, 0);
      const costKopecks = product.orderItems.reduce(
        (sum, item) => sum + item.costPriceSnapshotKopecks * item.quantity,
        0,
      );

      return {
        ...product,
        totalStock: product.batches.reduce((sum, batch) => sum + batch.stockQuantity, 0),
        nearestExpirationDate: product.batches[0]?.expirationDate ?? null,
        soldQuantity,
        profitKopecks: salesKopecks - costKopecks,
        orderItems: undefined,
      };
    });

    if (query.sort === 'quantity') {
      mapped.sort((a, b) => a.totalStock - b.totalStock);
    }
    if (query.sort === 'expiration') {
      mapped.sort(
        (a, b) =>
          (a.nearestExpirationDate?.getTime() ?? Number.MAX_SAFE_INTEGER) -
          (b.nearestExpirationDate?.getTime() ?? Number.MAX_SAFE_INTEGER),
      );
    }
    if (query.sort === 'profit_asc') {
      mapped.sort((a, b) => a.profitKopecks - b.profitKopecks);
    }
    if (query.sort === 'profit_desc') {
      mapped.sort((a, b) => b.profitKopecks - a.profitKopecks);
    }
    if (query.sort === 'popular') {
      mapped.sort((a, b) => b.soldQuantity - a.soldQuantity);
    }

    return { items: mapped, total, page, pageSize };
  }

  create(dto: CreateProductDto) {
    return this.prisma.product.create({ data: dto });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { batches: { orderBy: { expirationDate: 'asc' } } },
    });
    if (!product) {
      throw new NotFoundException('Продукт не найден');
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async batches(productId: string) {
    await this.findOne(productId);
    return this.prisma.productBatch.findMany({
      where: { productId },
      orderBy: { expirationDate: 'asc' },
    });
  }

  async createBatch(productId: string, dto: CreateBatchDto) {
    await this.findOne(productId);
    return this.prisma.productBatch.create({
      data: {
        ...dto,
        productId,
        expirationDate: new Date(dto.expirationDate),
        productionDate: dto.productionDate ? new Date(dto.productionDate) : undefined,
      },
    });
  }

  async updateBatch(id: string, dto: UpdateBatchDto) {
    const batch = await this.prisma.productBatch.findUnique({ where: { id } });
    if (!batch) {
      throw new NotFoundException('Партия не найдена');
    }
    return this.prisma.productBatch.update({
      where: { id },
      data: {
        ...dto,
        expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : undefined,
        productionDate: dto.productionDate ? new Date(dto.productionDate) : undefined,
      },
    });
  }

  async statistics(id: string) {
    const product = await this.findOne(id);
    const items = await this.prisma.orderItem.findMany({
      where: { productId: id, order: { status: { in: countedStatuses } } },
      select: {
        orderId: true,
        quantity: true,
        lineTotalKopecks: true,
        costPriceSnapshotKopecks: true,
        createdAt: true,
      },
    });

    const salesKopecks = items.reduce((sum, item) => sum + item.lineTotalKopecks, 0);
    const costKopecks = items.reduce((sum, item) => sum + item.costPriceSnapshotKopecks * item.quantity, 0);
    return {
      productName: product.name,
      ordersCount: new Set(items.map((item) => item.orderId)).size,
      soldQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      salesKopecks,
      costKopecks,
      profitKopecks: salesKopecks - costKopecks,
    };
  }

  async customers(id: string) {
    await this.findOne(id);
    return this.prisma.orderItem.findMany({
      where: { productId: id, order: { status: { in: countedStatuses } } },
      select: {
        batchNumberSnapshot: true,
        quantity: true,
        order: {
          select: {
            id: true,
            createdAt: true,
            customer: {
              select: { id: true, firstName: true, lastName: true, phone: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
