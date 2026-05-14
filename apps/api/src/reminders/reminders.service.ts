import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReminderStatus } from '@prisma/client';
import { RequestUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateReminderDto, UpdateReminderDto } from './dto/reminder.dto';

@Injectable()
export class RemindersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: { date?: string; status?: ReminderStatus; page?: string }) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const pageSize = 30;
    const dateFilter = query.date ? this.dateOnlyFilter(query.date) : undefined;
    const where: Prisma.ReminderWhereInput = {
      status: query.status,
      remindAt: dateFilter,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.reminder.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, login: true } },
          customer: { select: { id: true, firstName: true, lastName: true } },
          order: { select: { id: true, status: true } },
        },
        orderBy: { remindAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.reminder.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  create(dto: CreateReminderDto, user: RequestUser) {
    return this.prisma.reminder.create({
      data: {
        title: dto.title,
        description: dto.description,
        remindAt: new Date(dto.remindAt),
        assignedToId: dto.assignedToId ?? user.id,
        customerId: dto.customerId,
        orderId: dto.orderId,
      },
    });
  }

  async findOne(id: string) {
    const reminder = await this.prisma.reminder.findUnique({ where: { id } });
    if (!reminder) {
      throw new NotFoundException('Напоминание не найдено');
    }
    return reminder;
  }

  async update(id: string, dto: UpdateReminderDto) {
    await this.findOne(id);
    return this.prisma.reminder.update({
      where: { id },
      data: {
        ...dto,
        remindAt: dto.remindAt ? new Date(dto.remindAt) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.reminder.delete({ where: { id } });
    return { ok: true };
  }

  private dateOnlyFilter(date: string): Prisma.DateTimeFilter {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 1);
    return { gte: start, lt: end };
  }
}
