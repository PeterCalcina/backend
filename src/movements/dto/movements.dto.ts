import { IsEnum, IsInt, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { MovementType } from '@prisma/client';

export class CreateMovementDto {
  @IsEnum(MovementType)
  type: MovementType;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitCost: number;

  @IsNotEmpty()
  date: Date;

  @IsInt()
  itemId: number;
}
