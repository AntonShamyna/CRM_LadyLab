import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateBatchDto, CreateProductDto, UpdateBatchDto, UpdateProductDto } from './dto/product.dto';
import { ProductsService } from './products.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get('products')
  list(@Query() query: { search?: string; aroma?: string; sort?: string; page?: string }) {
    return this.products.list(query);
  }

  @Post('products')
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @Get('products/:id')
  findOne(@Param('id') id: string) {
    return this.products.findOne(id);
  }

  @Patch('products/:id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @Get('products/:id/statistics')
  statistics(@Param('id') id: string) {
    return this.products.statistics(id);
  }

  @Get('products/:id/customers')
  customers(@Param('id') id: string) {
    return this.products.customers(id);
  }

  @Get('products/:productId/batches')
  batches(@Param('productId') productId: string) {
    return this.products.batches(productId);
  }

  @Post('products/:productId/batches')
  createBatch(@Param('productId') productId: string, @Body() dto: CreateBatchDto) {
    return this.products.createBatch(productId, dto);
  }

  @Patch('batches/:id')
  updateBatch(@Param('id') id: string, @Body() dto: UpdateBatchDto) {
    return this.products.updateBatch(id, dto);
  }
}
