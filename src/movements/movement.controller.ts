import { Body, Controller, Post } from '@nestjs/common';
import { CreateMovementDto } from './dto/movements.dto';
import { MovementService } from './movement.service';

@Controller('movements')
export class MovementController {
  constructor(private readonly movementService: MovementService) {}

  @Post()
  createMovement(@Body() createMovementDto: CreateMovementDto) {
    return this.movementService.createMovement(createMovementDto);
  }
}