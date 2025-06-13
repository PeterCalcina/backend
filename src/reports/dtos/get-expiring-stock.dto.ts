import { IsOptional, IsInt, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetExpiringStockDto {
  @IsOptional()
  @IsEnum(['expired', 'expiring-soon', 'all'])
  status?: 'expired' | 'expiring-soon' | 'all' = 'expiring-soon';

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  daysUntilExpiration?: number = 10;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  itemId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  pageSize?: number = 10;
}