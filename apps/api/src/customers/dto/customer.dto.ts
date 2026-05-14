import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  lastName: string;

  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsString()
  phone: string;

  @IsString()
  city: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  personalDiscountPercent?: number;

  @IsOptional()
  @IsBoolean()
  isRegular?: boolean;

  @IsOptional()
  @IsBoolean()
  isBlacklisted?: boolean;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  personalDiscountPercent?: number;

  @IsOptional()
  @IsBoolean()
  isRegular?: boolean;

  @IsOptional()
  @IsBoolean()
  isBlacklisted?: boolean;
}
