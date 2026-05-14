import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateOrderDto, ReturnOrderDto, StatusActionDto, UpdateOrderDto } from './dto/order.dto';
import { OrdersService } from './orders.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(
    @Query()
    query: { status?: OrderStatus; month?: string; year?: string; search?: string; page?: string },
  ) {
    return this.orders.list(query);
  }

  @Post()
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: RequestUser) {
    return this.orders.create(dto, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orders.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.orders.update(id, dto);
  }

  @Post(':id/send')
  send(@Param('id') id: string, @CurrentUser() user: RequestUser, @Body() dto: StatusActionDto) {
    return this.orders.send(id, user, dto);
  }

  @Post(':id/paid')
  paid(@Param('id') id: string, @CurrentUser() user: RequestUser, @Body() dto: StatusActionDto) {
    return this.orders.paid(id, user, dto);
  }

  @Post(':id/return')
  returnOrder(@Param('id') id: string, @CurrentUser() user: RequestUser, @Body() dto: ReturnOrderDto) {
    return this.orders.returnOrder(id, user, dto);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: RequestUser, @Body() dto: StatusActionDto) {
    return this.orders.cancel(id, user, dto);
  }
}
