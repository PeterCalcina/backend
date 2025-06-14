import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Asegúrate de tenerlo
import { GetCurrentStockDto } from './dtos/get-current-stock.dto';
import { GetMovementHistoryDto } from './dtos/get-movement-history.dto';
import { isPast, parseISO, startOfDay, endOfDay, addDays } from 'date-fns';
import { GetExpiringStockDto } from './dtos/get-expiring-stock.dto';
import { QueryGetMovement } from './helpers/query-get-movement.helper';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getCurrentStockDto(query: GetCurrentStockDto) {
    const { itemId, itemName, minQty, maxQty, page, pageSize } = query;
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where: any = {
      qty: {
        gte: minQty,
        lte: maxQty,
      },
      id: itemId,
      name: itemName ? { contains: itemName, mode: 'insensitive' } : undefined,
    };

    Object.keys(where).forEach(
      (key) => where[key] === undefined && delete where[key],
    );

    const totalItems = await this.prisma.inventoryItem.count({ where });

    const items = await this.prisma.inventoryItem.findMany({
      where,
      select: {
        id: true,
        name: true,
        qty: true,
        cost: true,
      },
      skip,
      take,
    });

    const formattedItems = items.map((item) => ({
      ...item,
      currentTotalValue: item.qty * item.cost,
      unitCost: item.cost,
      totalQuantity: item.qty,
    }));

    return {
      data: formattedItems,
      total: totalItems,
      page,
      pageSize,
      totalPages: Math.ceil(totalItems / pageSize),
    };
  }

  async getMovementHistory(query: GetMovementHistoryDto) {
    const {
      startDate,
      endDate,
      itemId,
      movementType,
      batchCode,
      page,
      pageSize,
    } = query;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where: QueryGetMovement = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      itemId,
      type: movementType,
      batchCode: batchCode
        ? { contains: batchCode, mode: 'insensitive' }
        : undefined,
    };

    Object.keys(where).forEach(
      (key) => where[key] === undefined && delete where[key],
    );

    const totalItems = await this.prisma.movement.count({ where });

    const movements = await this.prisma.movement.findMany({
      where,
      select: {
        id: true,
        type: true,
        quantity: true,
        unitCost: true,
        batchCode: true,
        description: true,
        expirationDate: true,
        item: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take,
    });

    const formattedMovements = movements.map((m) => ({
      ...m,
      productName: m.item?.name,
      item: undefined,
    }));

    return {
      data: formattedMovements,
      total: totalItems,
      page,
      pageSize,
      totalPages: Math.ceil(totalItems / pageSize),
    };
  }

  async getExpiringStock(query: GetExpiringStockDto) {
    const { status, daysUntilExpiration, itemId, page, pageSize } = query;
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const today = startOfDay(new Date());
    const futureDate = endOfDay(addDays(today, daysUntilExpiration));

    const where: any = {
      type: 'ENTRY',
      remainingQuantity: {
        gt: 0,
      },
      expirationDate: {
        not: null,
      },
      itemId,
    };

    if (status === 'expired') {
      where.expirationDate.lte = today;
    } else if (status === 'expiring-soon') {
      where.expirationDate.gte = today;
      where.expirationDate.lte = futureDate;
    }

    Object.keys(where).forEach(
      (key) => where[key] === undefined && delete where[key],
    );

    const totalItems = await this.prisma.movement.count({ where });

    const expiringMovements = await this.prisma.movement.findMany({
      where,
      select: {
        id: true,
        batchCode: true,
        quantity: true,
        remainingQuantity: true,
        unitCost: true,
        expirationDate: true,
        createdAt: true,
        item: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        expirationDate: 'asc',
      },
      skip,
      take,
    });

    const formattedExpiringMovements = expiringMovements.map((m) => ({
      ...m,
      productName: m.item?.name,
      productId: m.item?.id,
      isExpired: m.expirationDate ? isPast(m.expirationDate) : false,
      item: undefined,
    }));

    return {
      data: formattedExpiringMovements,
      total: totalItems,
      page,
      pageSize,
      totalPages: Math.ceil(totalItems / pageSize),
    };
  }
}
