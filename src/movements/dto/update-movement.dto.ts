import { PartialType } from '@nestjs/mapped-types';
import { MovementDto } from './movement.dto';
import { IsNumber } from 'class-validator';

export class UpdateMovementDto extends PartialType(MovementDto) {
  @IsNumber({}, { message: 'La cantidad restante debe ser un número.' })
  remainingQuantity: number;
}