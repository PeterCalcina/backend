import { IsNotEmpty, IsString, IsNumber, Min, IsPositive, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInventoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  sku: string;

  // @IsNumber()
  // @IsInt()
  // @Min(0)
  // @IsPositive()
  // @Type(() => Number)
  // qty: number;

  // @IsNumber()
  // @Min(0)
  // @IsPositive()
  // @Type(() => Number)
  // cost: number;
}