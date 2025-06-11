import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';

export class CreateInventoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  sku: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  qty: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  cost: number;
}
