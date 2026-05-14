import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ReminderStatus } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateReminderDto, UpdateReminderDto } from './dto/reminder.dto';
import { RemindersService } from './reminders.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reminders')
export class RemindersController {
  constructor(private readonly reminders: RemindersService) {}

  @Get()
  list(@Query() query: { date?: string; status?: ReminderStatus; page?: string }) {
    return this.reminders.list(query);
  }

  @Post()
  create(@Body() dto: CreateReminderDto, @CurrentUser() user: RequestUser) {
    return this.reminders.create(dto, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reminders.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateReminderDto) {
    return this.reminders.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reminders.remove(id);
  }
}
