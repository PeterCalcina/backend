import { IsOptional, IsInt, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetCurrentStockDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  itemId?: number;

  @IsOptional()
  @IsString()
  itemName?: string; // Para buscar por nombre de producto

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  minQty?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  maxQty?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  page?: number = 1; // Página actual

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  pageSize?: number = 10; // Elementos por página
}