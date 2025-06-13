import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInventoryDto {
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  name: string;

  @IsNotEmpty({ message: 'El SKU es requerido' })
  @IsString({ message: 'El SKU debe ser una cadena de texto' })
  sku: string;

  @IsNotEmpty({ message: 'El margen de ganancia es requerido' })
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'El margen de ganancia debe ser un número válido' })
  @Min(0, { message: 'El margen de ganancia debe ser mayor o igual a 0' })
  @Type(() => Number)
  profitMargin: number;
}