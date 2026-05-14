import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AnalyticsService } from './analytics.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('summary')
  summary(@Query() query: { period?: string; month?: string; year?: string }) {
    return this.analytics.summary(query);
  }

  @Get('products')
  products(@Query() query: { period?: string; month?: string; year?: string }) {
    return this.analytics.products(query);
  }

  @Get('customers')
  customers(@Query() query: { period?: string; month?: string; year?: string }) {
    return this.analytics.customers(query);
  }

  @Get('orders')
  orders(@Query() query: { period?: string; month?: string; year?: string }) {
    return this.analytics.orders(query);
  }
}
