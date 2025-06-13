import { BadRequestException, Body, Controller, Get, Param, Post } from '@nestjs/common';
import { MovementDto } from './dto/movement.dto';
import { MovementService } from './movement.service';
import { successResponse } from 'src/common/responses/success-response';
import { MovementType } from '@prisma/client';

@Controller('movements')
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

  @Post()
  async createMovement(@Body() movementDto: MovementDto) {
    switch (movementDto.type) {
      case MovementType.ENTRY:
        const movement = await this.movementService.entry(movementDto);
        return successResponse(movement, 'Movimiento creado correctamente');
      case MovementType.SALE:
        const saleMovement = await this.movementService.sale(movementDto);
        return successResponse(saleMovement, 'Movimiento creado correctamente');
      case MovementType.EXPIRATION:
        const expirationMovement = await this.movementService.expiration(movementDto);
        return successResponse(expirationMovement, 'Movimiento creado correctamente');
      case MovementType.EXIT:
        const exitMovement = await this.movementService.exit(movementDto);
        return successResponse(exitMovement, 'Movimiento creado correctamente');
      default:
        throw new BadRequestException({
          message: 'Tipo de movimiento inválido.',
          technicalMessage: 'Invalid movement type.',
        });
    }
  }
}
