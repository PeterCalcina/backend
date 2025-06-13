import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateMovementDto } from './dto/movements.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { calculateCost } from './helpers/calculate-cost.helper';
import { InventoryService } from 'src/inventory/inventory.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class MovementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  findAll() {
    return this.prisma.movement.findMany();
  }

  findOne(id: number) {
    return this.prisma.movement.findUnique({
      where: { id },
    });
  }

  findOneByBatchCode(batchCode: string) {
    return this.prisma.movement.findUnique({
      where: { batchCode },
    });
  }

  findEntryByItemId(itemId: number, prisma: Prisma.TransactionClient = this.prisma) {
    return prisma.movement.findMany({
      where: { itemId, type: 'ENTRY', remainingQuantity: { gt: 0 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async entry(createMovementDto: CreateMovementDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const entries = await this.findEntryByItemId(createMovementDto.itemId, tx);

        const movement = await tx.movement.create({
          data: {
            ...createMovementDto,
            remainingQuantity: createMovementDto.quantity,
          },
        });

        const cost = calculateCost(
          entries,
          createMovementDto.quantity,
          createMovementDto.unitCost,
        );
        
        await this.inventoryService.updateCost(
          createMovementDto.itemId,
          cost,
          createMovementDto.quantity,
          tx,
        );

        return movement;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
          case 'P2002':
            throw new BadRequestException({
              message: 'Ya existe un movimiento con este código de lote',
              technicalMessage: 'A movement with this batch code already exists',
            });
          case 'P2003':
            throw new BadRequestException({
              message: 'El item referenciado no existe en el inventario',
              technicalMessage: 'The referenced item does not exist in the inventory',
            });
          default:
            throw new BadRequestException({
              message: 'Error al procesar el movimiento',
              technicalMessage: 'Error processing the movement: ' + error.message,
            });
        }
      }
      
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestException ({
          message: 'Datos de entrada inválidos',
          technicalMessage: 'Invalid input data: ' + error.message,
        });
      }

      throw new BadRequestException({
        message: 'Error inesperado al procesar el movimiento',
        technicalMessage: 'Unexpected error processing the movement: ' + error.message,
      });
    }
  }
}
