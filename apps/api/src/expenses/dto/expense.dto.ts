import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateExpenseDto {
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  year: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsString()
  category: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  amountKopecks: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class UpdateExpenseDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amountKopecks?: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
