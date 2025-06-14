import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { calculateWeightedAverageCost } from './helpers/calculate-cost.helper';
import { InventoryService } from 'src/inventory/inventory.service';
import { Movement, MovementType, Prisma, Status } from '@prisma/client';
import { MovementDto, UpdateMovementDto } from './dto';

@Injectable()
export class MovementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  findAll() {
    return this.prisma.movement.findMany({
      where: { status: Status.ACTIVE },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: number) {
    return this.prisma.movement.findUnique({
      where: { id, status: Status.ACTIVE },
    });
  }

  findAllEntriesByExpirationDate() {
    return this.prisma.movement.findMany({
      where: {
        type: MovementType.ENTRY,
        remainingQuantity: { gt: 0 },
        expirationDate: { not: null },
        status: Status.ACTIVE,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  findAllEntries() {
    return this.prisma.movement.findMany({
      where: {
        type: MovementType.ENTRY,
        remainingQuantity: { gt: 0 },
        status: Status.ACTIVE,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  findOneByBatchCode(
    batchCode: string,
    type: MovementType,
    prisma: Prisma.TransactionClient = this.prisma,
  ) {
    return prisma.movement.findFirst({
      where: {
        batchCode,
        type,
        remainingQuantity: { gt: 0 },
        status: Status.ACTIVE,
      },
    });
  }

  findOneByBatchCodeAndType(batchCode: string, type: MovementType) {
    return this.prisma.movement.findFirst({
      where: { batchCode, type, status: Status.ACTIVE },
    });
  }

  findEntriesByItemId(
    itemId: number,
    prisma: Prisma.TransactionClient = this.prisma,
  ) {
    return prisma.movement.findMany({
      where: {
        itemId,
        type: 'ENTRY',
        remainingQuantity: { gt: 0 },
        status: Status.ACTIVE,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async entry(entryMovementDto: MovementDto) {
    const entry = await this.findOneByBatchCodeAndType(
      entryMovementDto.batchCode,
      MovementType.ENTRY,
    );

    if (entry) {
      throw new BadRequestException({
        message: 'Ya existe una entrada con este código de lote',
        technicalMessage: 'An entry with this batch code already exists',
      });
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const entries = await this.findEntriesByItemId(
          entryMovementDto.itemId,
          tx,
        );

        const movement = await tx.movement.create({
          data: {
            ...entryMovementDto,
            remainingQuantity: entryMovementDto.quantity,
          },
        });

        const cost = calculateWeightedAverageCost(
          entries,
          entryMovementDto.quantity,
          entryMovementDto.unitCost,
        );

        await this.inventoryService.updateCostAfterEntry(
          entryMovementDto.itemId,
          cost,
          entryMovementDto.quantity,
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
              technicalMessage:
                'A movement with this batch code already exists',
            });
          case 'P2003':
            throw new BadRequestException({
              message: 'El item referenciado no existe en el inventario',
              technicalMessage:
                'The referenced item does not exist in the inventory',
            });
          default:
            throw new BadRequestException({
              message: 'Error al procesar la entrada',
              technicalMessage: 'Error processing the entry: ' + error.message,
            });
        }
      }

      if (error instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestException({
          message: 'Datos de entrada inválidos',
          technicalMessage: 'Invalid input data: ' + error.message,
        });
      }

      throw new BadRequestException({
        message: 'Error inesperado al procesar el movimiento',
        technicalMessage:
          'Unexpected error processing the movement: ' + error.message,
      });
    }
  }

  private async consumeStock(
    itemId: number,
    quantity: number,
    tx: Prisma.TransactionClient,
  ) {
    const entries = await this.findEntriesByItemId(itemId, tx);
    let remainingQty = quantity;
    const usedBatches = new Set<string>();

    for (const entry of entries) {
      if (remainingQty <= 0) break;

      const consumeQty = Math.min(entry.remainingQuantity, remainingQty);

      await tx.movement.update({
        where: { id: entry.id },
        data: {
          remainingQuantity: entry.remainingQuantity - consumeQty,
        },
      });

      remainingQty -= consumeQty;
      usedBatches.add(entry.batchCode);
    }

    if (remainingQty > 0) {
      throw new BadRequestException({
        message: 'No hay suficiente stock disponible para esta salida',
        technicalMessage: 'Insufficient stock available for this sale',
      });
    }

    const multipleBatchesUsed = usedBatches.size > 1;

    return {
      multipleBatchesUsed,
      usedBatches: Array.from(usedBatches),
    };
  }

  async sale(saleMovementDto: MovementDto) {
    let cost = 0;
    try {
      return await this.prisma.$transaction(async (tx) => {
        let batchSummary = '';

        const { multipleBatchesUsed, usedBatches } = await this.consumeStock(
          saleMovementDto.itemId,
          saleMovementDto.quantity,
          tx,
        );

        if (multipleBatchesUsed) {
          const entries = await this.findEntriesByItemId(
            saleMovementDto.itemId,
            tx,
          );
          cost = calculateWeightedAverageCost(entries);
          batchSummary = usedBatches.join(',');
        } else {
          batchSummary = usedBatches[0];
        }

        const movement = await tx.movement.create({
          data: {
            ...saleMovementDto,
            type: MovementType.SALE,
            batchCode: batchSummary,
            remainingQuantity: 0,
          },
        });

        await this.inventoryService.updateAfterMovement(
          saleMovementDto.itemId,
          {
            qty: saleMovementDto.quantity,
            cost: multipleBatchesUsed ? cost : undefined,
          },
          tx,
        );

        return movement;
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
          case 'P2003':
            throw new BadRequestException({
              message: 'El item referenciado no existe en el inventario',
              technicalMessage:
                'The referenced item does not exist in the inventory',
            });
          default:
            throw new BadRequestException({
              message: 'Error al procesar el movimiento de venta',
              technicalMessage:
                'Error processing the sale movement: ' + error.message,
            });
        }
      }

      throw new BadRequestException({
        message: 'Error inesperado al procesar la venta',
        technicalMessage:
          'Unexpected error processing the sale: ' + error.message,
      });
    }
  }

  async exit(exitMovementDto: MovementDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        let remainingStock = 0;

        const entry = await this.findOneByBatchCode(
          exitMovementDto.batchCode,
          MovementType.ENTRY,
          tx,
        );

        if (!entry) {
          throw new BadRequestException({
            message: 'No se encontró el lote especificado',
            technicalMessage: 'Batch not found',
          });
        }

        remainingStock = entry.remainingQuantity - exitMovementDto.quantity;

        if (remainingStock < 0) {
          throw new BadRequestException({
            message: `La cantidad a sacar excede el stock disponible en el lote`,
            technicalMessage: 'Exit quantity exceeds remaining stock in batch',
          });
        }

        await tx.movement.update({
          where: { id: entry.id },
          data: {
            remainingQuantity: remainingStock,
          },
        });

        const movement = await tx.movement.create({
          data: {
            ...exitMovementDto,
            type: MovementType.EXIT,
            unitCost: entry.unitCost,
            remainingQuantity: 0,
          },
        });

        let remainingEntries: Movement[] = [];

        if (remainingStock === 0) {
          remainingEntries = await this.findEntriesByItemId(
            exitMovementDto.itemId,
            tx,
          );
        }

        await this.inventoryService.updateAfterMovement(
          exitMovementDto.itemId,
          {
            qty: exitMovementDto.quantity,
            cost:
              remainingStock === 0
                ? calculateWeightedAverageCost(remainingEntries)
                : undefined,
          },
          tx,
        );

        return movement;
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException({
        message: 'Error al procesar la salida',
        technicalMessage: 'Error processing the exit: ' + error.message,
      });
    }
  }

  async expiration(expirationMovementDto: MovementDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const entry = await this.findOneByBatchCode(
          expirationMovementDto.batchCode,
          MovementType.ENTRY,
          tx,
        );

        if (!entry) {
          throw new BadRequestException({
            message: 'No se encontró el lote especificado',
            technicalMessage: 'Batch not found',
          });
        }

        if (entry.remainingQuantity < expirationMovementDto.quantity) {
          throw new BadRequestException({
            message:
              'La cantidad a expirar excede el stock disponible del lote',
            technicalMessage:
              'Expiration quantity exceeds available batch stock',
          });
        }

        await tx.movement.update({
          where: { id: entry.id },
          data: {
            remainingQuantity: 0,
          },
        });

        const movement = await tx.movement.create({
          data: {
            ...expirationMovementDto,
            type: MovementType.EXPIRATION,
            remainingQuantity: 0,
          },
        });

        const remainingEntries = await this.findEntriesByItemId(
          expirationMovementDto.itemId,
          tx,
        );

        await this.inventoryService.updateAfterMovement(
          expirationMovementDto.itemId,
          {
            qty: expirationMovementDto.quantity,
            cost:
              remainingEntries.length > 0
                ? calculateWeightedAverageCost(remainingEntries)
                : undefined,
          },
          tx,
        );

        return movement;
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException({
        message: 'Error al procesar la eliminación de producto expirado',
        technicalMessage:
          'Error processing the expiration movement: ' + error.message,
      });
    }
  }

  async update(id: number, updateMovementDto: UpdateMovementDto) {
    return await this.prisma.movement.update({
      where: { id },
      data: updateMovementDto,
    });
  }

  async delete(id: number) {
    return await this.prisma.movement.update({
      where: { id },
      data: {
        status: Status.INACTIVE,
      },
    });
  }
}
