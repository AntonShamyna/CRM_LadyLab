import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RequestUser } from '../common/decorators/current-user.decorator';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: { year?: string; month?: string; page?: string }) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const pageSize = 50;
    const where = {
      year: query.year ? Number(query.year) : undefined,
      month: query.month ? Number(query.month) : undefined,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.expense.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  create(dto: CreateExpenseDto, user: RequestUser) {
    return this.prisma.expense.create({
      data: { ...dto, createdById: user.id },
    });
  }

  async update(id: string, dto: UpdateExpenseDto) {
    await this.ensureExists(id);
    return this.prisma.expense.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.expense.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureExists(id: string) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });
    if (!expense) {
      throw new NotFoundException('Расход не найден');
    }
  }
}
