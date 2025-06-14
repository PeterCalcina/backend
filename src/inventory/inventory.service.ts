import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { Prisma } from '@prisma/client';
import { UpdateInventoryAfterMovementDto } from './dto/update-after-movement.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createInventory(
    createInventoryDto: CreateInventoryDto,
    userId: string,
  ) {
    try {
      this.logger.log(`Creando inventario para usuario ${userId}: ${JSON.stringify(createInventoryDto)}`);
      const item = await this.prisma.inventoryItem.create({
        data: {
          ...createInventoryDto,
          userId: userId,
          qty: 0,
          cost: 0,
        },
      });
      this.logger.log(`Inventario creado exitosamente: ${item.id}`);
      return item;
    } catch (error) {
      this.logger.error(
        `Error al crear inventario: ${error.message}`,
        error.stack,
      );
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException({
            message: 'El SKU ya existe',
            technicalMessage: `A product with SKU '${createInventoryDto.sku}' already exists.`,
          });
        }
      }
      throw new BadRequestException({
        message: 'Error al crear inventario',
        technicalMessage: error.message,
      });
    }
  }

  async findAll(userId: string) {
    this.logger.log(`Buscando todos los items para usuario ${userId}`);
    const items = await this.prisma.inventoryItem.findMany({
      where: {
        userId: userId,
        status: 'ACTIVE',
      },
    });
    this.logger.debug(`Encontrados ${items.length} items activos`);
    return items;
  }

  async findOne(id: number, userId: string) {
    this.logger.log(`Buscando item ${id}`);
    const item = await this.prisma.inventoryItem.findUnique({
      where: {
        id,
        userId,
        status: 'ACTIVE',
      },
    });

    if (!item) {
      this.logger.warn(`Item ${id} no encontrado`);
      throw new NotFoundException({
        message: 'El producto no existe',
        technicalMessage: `Inventory item with ID ${id} not found.`,
      });
    }
    this.logger.debug(`Item ${id} encontrado: ${JSON.stringify(item)}`);
    return item;
  }

  async update(id: number, updateInventoryDto: UpdateInventoryDto, userId: string) {
    try {
      this.logger.log(`Actualizando item ${id}: ${JSON.stringify(updateInventoryDto)}`);
      const item = await this.prisma.inventoryItem.update({
        where: { id, userId },
        data: updateInventoryDto,
      });
      this.logger.log(`Item ${id} actualizado exitosamente`);
      return item;
    } catch (error) {
      this.logger.error(
        `Error al actualizar item ${id}: ${error.message}`,
        error.stack,
      );
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: 'El producto no existe',
            technicalMessage: `Inventory item with ID ${id} not found for update.`,
          });
        }
        if (error.code === 'P2002') {
          throw new BadRequestException({
            message: 'El SKU ya existe',
            technicalMessage: `SKU '${updateInventoryDto.sku}' already exists.`,
          });
        }
      }
      throw new BadRequestException({
        message: 'Error al actualizar item',
        technicalMessage: error.message,
      });
    }
  }

  async updateCostAfterEntry(
    id: number,
    cost: number,
    qty: number,
    prisma: Prisma.TransactionClient = this.prisma,
    userId: string,
  ) {
    this.logger.log(`Actualizando costo después de entrada para item ${id}. Costo: ${cost}, Cantidad: ${qty}`);
    const item = await this.findOne(id, userId);

    await prisma.inventoryItem.update({
      where: { id, userId },
      data: {
        cost,
        qty: { increment: qty },
        lastEntry: new Date(),
      },
    });
    this.logger.log(`Costo y cantidad actualizados exitosamente para item ${id}`);
  }

  async updateAfterMovement(
    id: number,
    updateInventoryDto: UpdateInventoryAfterMovementDto,
    prisma: Prisma.TransactionClient = this.prisma,
    userId: string,
  ) {
    this.logger.log(`Actualizando inventario después de movimiento para item ${id}: ${JSON.stringify(updateInventoryDto)}`);
    const item = await this.findOne(id, userId);

    await prisma.inventoryItem.update({
      where: { id, userId },
      data: {
        cost: updateInventoryDto.cost ?? item.cost,
        qty: { decrement: updateInventoryDto.qty },
      },
    });
    this.logger.log(`Inventario actualizado exitosamente para item ${id}`);
  }

  async delete(id: number, userId: string) {
    try {
      this.logger.log(`Eliminando item ${id}`);
      const item = await this.prisma.inventoryItem.update({
        where: { id, userId },
        data: { status: 'INACTIVE' },
      });
      this.logger.log(`Item ${id} eliminado exitosamente`);
      return item;
    } catch (error) {
      this.logger.error(
        `Error al eliminar item ${id}: ${error.message}`,
        error.stack,
      );
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: 'El producto no existe',
            technicalMessage: `Inventory item with ID ${id} not found for deletion.`,
          });
        }
      }
      throw new BadRequestException({
        message: 'Error al eliminar item',
        technicalMessage: error.message,
      });
    }
  }
}
