import { BadRequestException, Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
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

  @Get('entries-by-expiration-date')
  async findAllEntriesByExpirationDate() {
    const movements = await this.movementService.findAllEntriesByExpirationDate();
    return successResponse(movements, 'Movimientos encontrados correctamente');
  }

  @Get('entries')
  async findAllEntries() {
    const movements = await this.movementService.findAllEntries();
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
        return successResponse(movement, 'Entrada realizada correctamente');
      case MovementType.SALE:
        const saleMovement = await this.movementService.sale(movementDto);
        return successResponse(saleMovement, 'Venta realizada correctamente');
      case MovementType.EXPIRATION:
        const expirationMovement = await this.movementService.expiration(movementDto);
        return successResponse(expirationMovement, 'Eliminación de producto expirado realizado correctamente.');
      case MovementType.EXIT:
        const exitMovement = await this.movementService.exit(movementDto);
        return successResponse(exitMovement, 'Salida de producto realizada correctamente');
      default:
        throw new BadRequestException({
          message: 'Tipo de movimiento inválido.',
          technicalMessage: 'Invalid movement type.',
        });
    }
  }
}
