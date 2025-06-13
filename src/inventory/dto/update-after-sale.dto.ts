import { IsNumber, IsOptional } from "class-validator";

export class UpdateInventoryAfterSaleDto {
  @IsNumber()
  qty: number;

  @IsNumber()
  @IsOptional()
  cost?: number;
}