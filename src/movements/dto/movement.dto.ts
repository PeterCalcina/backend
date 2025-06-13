import {
  IsEnum,
  IsInt,
  IsNumber,
  IsString,
  Min,
  IsOptional,
  IsDate,
} from 'class-validator';
import { MovementType } from '@prisma/client';
import { Type } from 'class-transformer';

export class MovementDto {
  @IsEnum(MovementType, { message: 'El tipo de movimiento es inválido.' })
  type: MovementType;

  @IsInt({ message: 'La cantidad debe ser un número entero.' })
  @Min(1, { message: 'La cantidad debe ser al menos 1.' })
  quantity: number;

  @IsNumber({}, { message: 'El costo unitario debe ser un número.' })
  @Min(0, { message: 'El costo unitario no puede ser negativo.' })
  unitCost: number;

  @IsInt({ message: 'El ID del producto debe ser un número entero.' })
  @Min(1, { message: 'El ID del producto debe ser al menos 1.' })
  itemId: number;

  @IsString({ message: 'La descripción debe ser una cadena de texto.' })
  description: string;

  @IsString({ message: 'El código de lote debe ser una cadena de texto.' })
  batchCode: string;

  @IsOptional()
  @IsDate ({ message: 'La fecha de expiración debe ser una fecha válida.' })
  @Type(() => Date) 
  expirationDate?: Date;
}