import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async createInventory(
    createInventoryDto: CreateInventoryDto,
    userId: string,
  ) {
    try {
      const item = await this.prisma.inventoryItem.create({
        data: {
          ...createInventoryDto,
          userId: userId,
        },
      });
      return item;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException({ message: 'El SKU ya existe', technicalMessage: `A product with SKU '${createInventoryDto.sku}' already exists.` });
        }
      }
      throw error;
    }
  }

  async findAll(userId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: {
        userId: userId,
      },
    });

    return items; 
  }

  async findOne(id: number) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: {
        id,
      },
    });

    if (!item) {
      throw new NotFoundException({ message: 'El producto no existe', technicalMessage: `Inventory item with ID ${id} not found.` });
    }
    return item;
  }

  async update(id: number, updateInventoryDto: UpdateInventoryDto) {
    try {
      const item = await this.prisma.inventoryItem.update({
        where: { id },
        data: updateInventoryDto,
      });
      
      return item;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2025: Producto no encontrado
        if (error.code === 'P2025') {
          throw new NotFoundException({ message: 'El producto no existe', technicalMessage: `Inventory item with ID ${id} not found for update.` });
        }
        // P2002: SKU ya existe
        if (error.code === 'P2002') {
          throw new BadRequestException({ message: 'El SKU ya existe', technicalMessage: `SKU '${updateInventoryDto.sku}' already exists.` });
        }
      }
      throw error;
    }
  }

  async delete(id: number) {
    try {
      const item = await this.prisma.inventoryItem.delete({
        where: { id },
      });
      return item;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({ message: 'El producto no existe', technicalMessage: `Inventory item with ID ${id} not found for deletion.` });
        }
      }
      throw error;
    }
  }
}