import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { calculateWeightedAverageCost } from './helpers/calculate-cost.helper';
import { InventoryService } from 'src/inventory/inventory.service';
import { Movement, MovementType, Prisma, Status } from '@prisma/client';
import { MovementDto, UpdateMovementDto } from './dto';

@Injectable()
export class MovementService {
  private readonly logger = new Logger(MovementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  findAll(userId: string) {
    return this.prisma.movement.findMany({
      where: { userId, status: Status.ACTIVE },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: number, userId: string) {
    return this.prisma.movement.findUnique({
      where: { id, userId, status: Status.ACTIVE },
    });
  }   

  findAllEntriesByExpirationDate(userId: string) {
    return this.prisma.movement.findMany({
      where: {
        userId,
        type: MovementType.ENTRY,
        remainingQuantity: { gt: 0 },
        expirationDate: { not: null },
        status: Status.ACTIVE,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  findAllEntries(userId: string) {
    return this.prisma.movement.findMany({
      where: {
        userId,
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
    userId: string,
  ) {
    return prisma.movement.findFirst({
      where: {
        userId,
        batchCode,
        type,
        remainingQuantity: { gt: 0 },
        status: Status.ACTIVE,
      },
    });
  }

  findOneByBatchCodeAndType(
    batchCode: string,
    type: MovementType,
    userId: string,
  ) {
    return this.prisma.movement.findFirst({
      where: { userId, batchCode, type, status: Status.ACTIVE },
    });
  }

  findEntriesByItemId(
    itemId: number,
    prisma: Prisma.TransactionClient = this.prisma,
    userId: string,
  ) {
    return prisma.movement.findMany({
      where: {
        userId,
        itemId,
        type: MovementType.ENTRY,
        remainingQuantity: { gt: 0 },
        status: Status.ACTIVE,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async entry(entryMovementDto: MovementDto, userId: string) {
    try {
      this.logger.log(
        `Iniciando entrada de producto: ${JSON.stringify(entryMovementDto)}`,
      );
      const entry = await this.findOneByBatchCodeAndType(
        entryMovementDto.batchCode,
        MovementType.ENTRY,
        userId,
      );

      if (entry) {
        throw new BadRequestException({
          message: 'Ya existe una entrada con este código de lote',
          technicalMessage: 'An entry with this batch code already exists',
        });
      }

      return await this.prisma.$transaction(async (tx) => {
        const entries = await this.findEntriesByItemId(
          entryMovementDto.itemId,
          tx,
          userId,
        );
        this.logger.debug(
          `Entradas encontradas para el item ${entryMovementDto.itemId}: ${entries.length}`,
        );

        const movement = await tx.movement.create({
          data: {
            ...entryMovementDto,
            batchCode: entryMovementDto.batchCode,
            remainingQuantity: entryMovementDto.quantity,
            userId: userId,
          },
        });
        this.logger.log(`Movimiento de entrada creado: ${movement.id}`);

        const cost = calculateWeightedAverageCost(
          entries,
          entryMovementDto.quantity,
          entryMovementDto.unitCost,
        );
        this.logger.debug(`Costo calculado: ${cost}`);

        await this.inventoryService.updateCostAfterEntry(
          entryMovementDto.itemId,
          cost,
          entryMovementDto.quantity,
          tx,
          userId,
        );
        this.logger.log(
          `Inventario actualizado para el item ${entryMovementDto.itemId}`,
        );

        return movement;
      });
    } catch (error) {
      this.logger.error(
        `Error en entrada de producto: ${error.message}`,
        error.stack,
      );
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
    userId: string,
  ) {
    const entries = await this.findEntriesByItemId(itemId, tx, userId);
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

  async sale(saleMovementDto: MovementDto, userId: string) {
    try {
      this.logger.log(`Iniciando venta: ${JSON.stringify(saleMovementDto)}`);
      let cost = 0;

      return await this.prisma.$transaction(async (tx) => {
        let batchSummary = '';

        const { multipleBatchesUsed, usedBatches } = await this.consumeStock(
          saleMovementDto.itemId,
          saleMovementDto.quantity,
          tx,
          userId,
        );

        if (multipleBatchesUsed) {
          const entries = await this.findEntriesByItemId(
            saleMovementDto.itemId,
            tx,
            userId,
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
            userId: userId,
          },
        });
        this.logger.log(`Movimiento de venta creado: ${movement.id}`);

        await this.inventoryService.updateAfterMovement(
          saleMovementDto.itemId,
          {
            qty: saleMovementDto.quantity,
            cost: multipleBatchesUsed ? cost : undefined,
          },
          tx,
          userId,
        );
        this.logger.log(
          `Inventario actualizado después de la venta para el item ${saleMovementDto.itemId}`,
        );

        return movement;
      });
    } catch (error) {
      this.logger.error(`Error en venta: ${error.message}`, error.stack);
      if (error instanceof BadRequestException) {
        throw new BadRequestException({
          message: 'Error al procesar la venta',
          technicalMessage: 'Error processing the sale: ' + error.message,
        });
      }
      throw new BadRequestException({
        message: 'Error al procesar la venta',
        technicalMessage: 'Error processing the sale: ' + error.message,
      });
    }
  }

  async exit(exitMovementDto: MovementDto, userId: string) {
    try {
      this.logger.log(
        `Iniciando salida por lote: ${JSON.stringify(exitMovementDto)}`,
      );
      return await this.prisma.$transaction(async (tx) => {
        let remainingStock = 0;

        const entry = await this.findOneByBatchCode(
          exitMovementDto.batchCode,
          MovementType.ENTRY,
          tx,
          userId,
        );

        if (!entry) {
          this.logger.warn(`Lote no encontrado: ${exitMovementDto.batchCode}`);
          throw new BadRequestException({
            message: 'No se encontró el lote especificado',
            technicalMessage: 'Batch not found',
          });
        }

        remainingStock = entry.remainingQuantity - exitMovementDto.quantity;

        if (remainingStock < 0) {
          this.logger.warn(
            `Stock insuficiente en lote ${exitMovementDto.batchCode}. Stock actual: ${entry.remainingQuantity}, Cantidad solicitada: ${exitMovementDto.quantity}`,
          );
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
        this.logger.log(
          `Stock actualizado para el lote ${exitMovementDto.batchCode}. Nuevo stock: ${remainingStock}`,
        );

        const movement = await tx.movement.create({
          data: {
            ...exitMovementDto,
            type: MovementType.EXIT,
            batchCode: exitMovementDto.batchCode,
            unitCost: entry.unitCost,
            remainingQuantity: 0,
            userId: userId,
          },
        });
        this.logger.log(`Movimiento de salida creado: ${movement.id}`);

        let remainingEntries: Movement[] = [];

        if (remainingStock === 0) {
          remainingEntries = await this.findEntriesByItemId(
            exitMovementDto.itemId,
            tx,
            userId,
          );
          this.logger.debug(
            `Entradas restantes encontradas: ${remainingEntries.length}`,
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
          userId,
        );
        this.logger.log(
          `Inventario actualizado después de la salida para el item ${exitMovementDto.itemId}`,
        );

        return movement;
      });
    } catch (error) {
      this.logger.error(
        `Error en salida por lote: ${error.message}`,
        error.stack,
      );
      if (error instanceof BadRequestException) {
        throw new BadRequestException({
          message: 'Error al procesar la salida',
          technicalMessage: 'Error processing the exit: ' + error.message,
        });
      }
      throw new BadRequestException({
        message: 'Error al procesar la salida',
        technicalMessage: 'Error processing the exit: ' + error.message,
      });
    }
  }

  async expiration(expirationMovementDto: MovementDto, userId: string) {
    try {
      this.logger.log(
        `Iniciando expiración: ${JSON.stringify(expirationMovementDto)}`,
      );
      return await this.prisma.$transaction(async (tx) => {
        const entry = await this.findOneByBatchCode(
          expirationMovementDto.batchCode,
          MovementType.ENTRY,
          tx,
          userId,
        );

        if (!entry) {
          this.logger.warn(
            `Lote no encontrado para expiración: ${expirationMovementDto.batchCode}`,
          );
          throw new BadRequestException({
            message:
              'No se encontró el lote especificado o no tiene stock disponible',
            technicalMessage: 'Batch not found or has no available stock',
          });
        }

        if (entry.remainingQuantity < expirationMovementDto.quantity) {
          this.logger.warn(
            `Cantidad de expiración excede el stock disponible. Stock: ${entry.remainingQuantity}, Cantidad solicitada: ${expirationMovementDto.quantity}`,
          );
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
        this.logger.log(
          `Stock del lote ${expirationMovementDto.batchCode} actualizado a 0 por expiración`,
        );

        const movement = await tx.movement.create({
          data: {
            ...expirationMovementDto,
            type: MovementType.EXPIRATION,
            batchCode: expirationMovementDto.batchCode,
            remainingQuantity: 0,
            userId: userId,
          },
        });
        this.logger.log(`Movimiento de expiración creado: ${movement.id}`);

        const remainingEntries = await this.findEntriesByItemId(
          expirationMovementDto.itemId,
          tx,
          userId,
        );
        this.logger.debug(
          `Entradas restantes encontradas: ${remainingEntries.length}`,
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
          userId,
        );
        this.logger.log(
          `Inventario actualizado después de la expiración para el item ${expirationMovementDto.itemId}`,
        );

        return movement;
      });
    } catch (error) {
      this.logger.error(`Error en expiración: ${error.message}`, error.stack);
      if (error instanceof BadRequestException) {
        throw new BadRequestException({
          message: 'Error al procesar la expiración',
          technicalMessage: 'Error processing the expiration: ' + error.message,
        });
      }
      throw new BadRequestException({
        message: 'Error al procesar la eliminación de producto expirado',
        technicalMessage:
          'Error processing the expiration movement: ' + error.message,
      });
    }
  }

  async update(
    id: number,
    updateMovementDto: UpdateMovementDto,
    userId: string,
  ) {
    try {
      this.logger.log(
        `Actualizando movimiento ${id}: ${JSON.stringify(updateMovementDto)}`,
      );
      const movement = await this.prisma.movement.update({
        where: { id, userId },
        data: updateMovementDto,
      });
      this.logger.log(`Movimiento ${id} actualizado exitosamente`);
      return movement;
    } catch (error) {
      this.logger.error(
        `Error al actualizar movimiento ${id}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException({
        message: 'Error al actualizar movimiento',
        technicalMessage: error.message,
      });
    }
  }

  async delete(id: number, userId: string) {
    try {
      this.logger.log(`Eliminando movimiento ${id}`);
      const movement = await this.prisma.movement.update({
        where: { id, userId },
        data: {
          status: Status.INACTIVE,
        },
      });
      this.logger.log(`Movimiento ${id} eliminado exitosamente`);
      return movement;
    } catch (error) {
      this.logger.error(
        `Error al eliminar movimiento ${id}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException({
        message: 'Error al eliminar movimiento',
        technicalMessage: error.message,
      });
    }
  }
}
