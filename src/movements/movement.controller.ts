import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { MovementType } from '@prisma/client';
import { MovementService } from './movement.service';
import { successResponse } from 'src/common/responses/success-response';
import { UpdateMovementDto, MovementDto } from './dto';
import { User } from 'src/auth/user.decorator';


@Controller('movements')
export class MovementController {
  constructor(private readonly movementService: MovementService) {}

  @Get()
  async findAll(@User('id') userId: string) {
    const movements = await this.movementService.findAll(userId);
    return successResponse(movements, 'Movimientos encontrados correctamente');
  }

  @Get('entries-by-expiration-date')
  async findAllEntriesByExpirationDate(@User('id') userId: string) {
    const movements = await this.movementService.findAllEntriesByExpirationDate(userId);
    return successResponse(movements, 'Movimientos encontrados correctamente');
  }

  @Get('entries')
  async findAllEntries(@User('id') userId: string) {
    const movements = await this.movementService.findAllEntries(userId);
    return successResponse(movements, 'Movimientos encontrados correctamente');
  }

  @Get(':id')
  async findOne(@User('id') userId: string, @Param('id') id: number) {
    const movement = await this.movementService.findOne(id, userId);
    return successResponse(movement, 'Movimiento encontrado correctamente');
  } 

  @Post()
  async createMovement(@User('id') userId: string, @Body() movementDto: MovementDto) {
    switch (movementDto.type) {
      case MovementType.ENTRY:
        const movement = await this.movementService.entry(movementDto, userId);
        return successResponse(movement, 'Entrada realizada correctamente');
      case MovementType.SALE:
        const saleMovement = await this.movementService.sale(movementDto, userId);
        return successResponse(saleMovement, 'Venta realizada correctamente');
      case MovementType.EXPIRATION:
        const expirationMovement = await this.movementService.expiration(movementDto, userId);
        return successResponse(expirationMovement, 'Eliminación de producto expirado realizado correctamente.');
      case MovementType.EXIT:
        const exitMovement = await this.movementService.exit(movementDto, userId);
        return successResponse(exitMovement, 'Salida de producto realizada correctamente');
      default:
        throw new BadRequestException({
          message: 'Tipo de movimiento inválido.',
          technicalMessage: 'Invalid movement type.',
        });
    }
  }

  @Patch(':id')
  async updateMovement(@User('id') userId: string, @Param('id') id: number, @Body() updateMovementDto: UpdateMovementDto) {
    const movement = await this.movementService.update(id, updateMovementDto, userId);
    return successResponse(movement, 'Entrada actualizada correctamente');
  }

  @Delete(':id')
  async deleteMovement(@User('id') userId: string, @Param('id') id: number) {
    const movement = await this.movementService.delete(id, userId);
    return successResponse(movement, 'Entrada eliminada correctamente');
  }
}
