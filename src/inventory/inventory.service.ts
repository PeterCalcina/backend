import { Injectable } from '@nestjs/common';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateInventoryDto } from './dto/update-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async createInventory(
    createInventoryDto: CreateInventoryDto,
    userId: string,
  ) {
    return this.prisma.inventoryItem.create({
      data: {
        ...createInventoryDto,
        userId: userId,
      },
    });
  }

  async findAll(id: string) {
    return this.prisma.inventoryItem.findMany({
      where: {
        userId: id,
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.inventoryItem.findUnique({
      where: {
        id,
      },
    });
  }

  async update(id: number, updateInventoryDto: UpdateInventoryDto) {
    return this.prisma.inventoryItem.update({
      where: { id },
      data: updateInventoryDto,
    });
  }

  async delete(id: number) {
    return this.prisma.inventoryItem.delete({
      where: { id },
    });
  }
}