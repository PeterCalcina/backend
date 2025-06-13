import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateMovementDto } from './dto/movements.dto';
import { MovementService } from './movement.service';
import { successResponse } from 'src/common/responses/success-response';

@Controller('movement')
export class MovementController {
  constructor(private readonly movementService: MovementService) {}

  @Get()
  async findAll() {
    const movements = await this.movementService.findAll();
    return successResponse(movements, 'Movimientos encontrados correctamente');
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    const movement = await this.movementService.findOne(id);
    return successResponse(movement, 'Movimiento encontrado correctamente');
  }

  @Post('entry')
  async entry(@Body() createMovementDto: CreateMovementDto) {
    const movement = await this.movementService.entry(createMovementDto);
    return successResponse(movement, 'Movimiento creado correctamente');
  }
}