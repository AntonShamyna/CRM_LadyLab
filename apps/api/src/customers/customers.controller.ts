import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  list(@Query() query: { search?: string; city?: string; sort?: string; page?: string }) {
    return this.customers.list(query);
  }

  @Post()
  create(@Body() dto: CreateCustomerDto) {
    return this.customers.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customers.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customers.update(id, dto);
  }

  @Get(':id/orders')
  orders(@Param('id') id: string) {
    return this.customers.orders(id);
  }

  @Get(':id/products')
  products(@Param('id') id: string) {
    return this.customers.products(id);
  }

  @Get(':id/statistics')
  statistics(@Param('id') id: string) {
    return this.customers.statistics(id);
  }
}
