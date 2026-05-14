import { ProductUnit } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  volume: number;

  @IsEnum(ProductUnit)
  unit: ProductUnit;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  salePriceKopecks: number;

  @IsOptional()
  @IsString()
  aroma?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  volume?: number;

  @IsOptional()
  @IsEnum(ProductUnit)
  unit?: ProductUnit;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  salePriceKopecks?: number;

  @IsOptional()
  @IsString()
  aroma?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateBatchDto {
  @IsString()
  batchNumber: string;

  @Type(() => Number)
  @IsInt()
  stockQuantity: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  costPriceKopecks: number;

  @IsDateString()
  expirationDate: string;

  @IsOptional()
  @IsDateString()
  productionDate?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class UpdateBatchDto {
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  stockQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  costPriceKopecks?: number;

  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @IsOptional()
  @IsDateString()
  productionDate?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}
