import { IsDate, IsOptional, IsInt, IsEnum, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MovementType } from '@prisma/client';

export class GetMovementHistoryDto {
  @IsDate({ message: 'La fecha de inicio debe ser una fecha válida.' })
  @Type(() => Date)
  startDate: Date;

  @IsDate({ message: 'La fecha de fin debe ser una fecha válida.' })
  @Type(() => Date)
  endDate: Date;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  itemId?: number;

  @IsOptional()
  @IsEnum(MovementType)
  movementType?: MovementType;

  @IsOptional()
  @IsString()
  batchCode?: string;

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