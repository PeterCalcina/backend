import { IsNumber, IsOptional } from "class-validator";

export class UpdateInventoryAfterMovementDto {
  @IsNumber()
  qty: number;

  @IsNumber()
  @IsOptional()
  cost?: number;
}