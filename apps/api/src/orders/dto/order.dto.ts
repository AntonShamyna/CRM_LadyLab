import { DeliveryService, PaymentMethod, ReturnStockAction } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrderItemDto {
  @IsString()
  productId: string;

  @IsString()
  batchId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsString()
  customerId: string;

  @IsEnum(DeliveryService)
  deliveryService: DeliveryService;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  deliveryPriceKopecks: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @Type(() => Number)
  @Min(0)
  @Max(100)
  discountPercent: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

export class UpdateOrderDto {
  @IsOptional()
  @IsEnum(DeliveryService)
  deliveryService?: DeliveryService;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  deliveryPriceKopecks?: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class ReturnOrderDto {
  @IsEnum(ReturnStockAction)
  stockAction: ReturnStockAction;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class StatusActionDto {
  @IsOptional()
  @IsString()
  comment?: string;
}
