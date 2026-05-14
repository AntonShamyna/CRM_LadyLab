import { Injectable } from '@nestjs/common';
import { Prisma, ProductBatch } from '@prisma/client';

@Injectable()
export class StockService {
  getWarnings(items: { quantity: number; batch: ProductBatch }[]) {
    return items
      .filter((item) => item.batch.stockQuantity - item.quantity < 0)
      .map((item) => ({
        batchId: item.batch.id,
        batchNumber: item.batch.batchNumber,
        requested: item.quantity,
        available: item.batch.stockQuantity,
        deficit: item.quantity - item.batch.stockQuantity,
      }));
  }

  async decrementBatches(
    tx: Prisma.TransactionClient,
    items: { batchId: string; quantity: number }[],
  ) {
    for (const item of items) {
      await tx.productBatch.update({
        where: { id: item.batchId },
        data: { stockQuantity: { decrement: item.quantity } },
      });
    }
  }

  async incrementBatches(
    tx: Prisma.TransactionClient,
    items: { batchId: string; quantity: number }[],
  ) {
    for (const item of items) {
      await tx.productBatch.update({
        where: { id: item.batchId },
        data: { stockQuantity: { increment: item.quantity } },
      });
    }
  }
}
