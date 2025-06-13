import { IsDate, IsEnum, IsInt, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { MovementType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateMovementDto {
  @IsEnum(MovementType)
  type: MovementType;

  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  name: string; 

  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  batchCode: string;

  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad debe ser mayor o igual a 1' })
  quantity: number;

  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'El costo unitario debe ser un número válido' })
  @Min(0, { message: 'El costo unitario debe ser mayor o igual a 0' })
  unitCost: number;

  @IsNotEmpty({ message: 'La descripción es requerida' })
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  description: string;

  @IsNotEmpty({ message: 'La fecha de expiración es requerida' })
  @IsDate({ message: 'La fecha de expiración debe ser una fecha válida' })
  @Type(() => Date)
  expirationDate: Date;

  @IsInt()
  itemId: number;
}
