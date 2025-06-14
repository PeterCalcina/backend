import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetCurrentStockDto } from './dtos/get-current-stock.dto';
import { GetMovementHistoryDto } from './dtos/get-movement-history.dto';
import { isPast, startOfDay, endOfDay, addDays } from 'date-fns';
import { GetExpiringStockDto } from './dtos/get-expiring-stock.dto';
import {
  QueryGetMovement,
  QueryGetCurrentStock,
  QueryGetExpiringStock,
} from './helpers';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private prisma: PrismaService) {}

  async getCurrentStockDto(query: GetCurrentStockDto, userId: string) {
    try {
      this.logger.log(`Generando reporte de stock actual con filtros: ${JSON.stringify(query)}`);
      const { itemId, itemName, minQty, maxQty, page, pageSize } = query;
      const skip = (page - 1) * pageSize;
      const take = pageSize;

      const where: QueryGetCurrentStock = {
        qty: {
          gte: minQty,
          lte: maxQty,
        },
        id: itemId,
        name: itemName ? { contains: itemName, mode: 'insensitive' } : undefined,
        userId,
      };

      Object.keys(where).forEach(
        (key) => where[key] === undefined && delete where[key],
      );

      const totalItems = await this.prisma.inventoryItem.count({ where });
      this.logger.debug(`Total de items encontrados: ${totalItems}`);

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
      this.logger.debug(`Items recuperados: ${items.length}`);

      const formattedItems = items.map((item) => ({
        ...item,
        currentTotalValue: item.qty * item.cost,
        unitCost: item.cost,
        totalQuantity: item.qty,
      }));

      this.logger.log('Reporte de stock actual generado exitosamente');
      return {
        data: formattedItems,
        total: totalItems,
        page,
        pageSize,
        totalPages: Math.ceil(totalItems / pageSize),
      };
    } catch (error) {
      this.logger.error(
        `Error al generar reporte de stock actual: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException({
        message: 'Error al generar reporte de stock actual',
        technicalMessage: error.message,
      });
    } 
  }

  async getMovementHistory(query: GetMovementHistoryDto, userId: string) {
    try {
      this.logger.log(`Generando historial de movimientos con filtros: ${JSON.stringify(query)}`);
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
        userId,
        batchCode: batchCode
          ? { contains: batchCode, mode: 'insensitive' }
          : undefined,
      };

      Object.keys(where).forEach(
        (key) => where[key] === undefined && delete where[key],
      );

      const totalItems = await this.prisma.movement.count({ where });
      this.logger.debug(`Total de movimientos encontrados: ${totalItems}`);

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
          createdAt: true,
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
      this.logger.debug(`Movimientos recuperados: ${movements.length}`);

      const formattedMovements = movements.map((m) => ({
        ...m,
        productName: m.item?.name,
        item: undefined,
      }));

      this.logger.log('Historial de movimientos generado exitosamente');
      return {
        data: formattedMovements,
        total: totalItems,
        page,
        pageSize,
        totalPages: Math.ceil(totalItems / pageSize),
      };
    } catch (error) {
      this.logger.error(
        `Error al generar historial de movimientos: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException({
        message: 'Error al generar historial de movimientos',
        technicalMessage: error.message,
      });
    }
  }

  async getExpiringStock(query: GetExpiringStockDto, userId: string) {
    try {
      this.logger.log(`Generando reporte de stock por expirar con filtros: ${JSON.stringify(query)}`);
      const { status, daysUntilExpiration, itemId, page, pageSize } = query;
      const skip = (page - 1) * pageSize;
      const take = pageSize;

      const today = startOfDay(new Date());
      const futureDate = endOfDay(addDays(today, daysUntilExpiration));
      this.logger.debug(`Rango de fechas: ${today} - ${futureDate}`);

      const where: QueryGetExpiringStock = {
        type: 'ENTRY',
        itemId,
        userId,
      };

      if (status === 'expired') {
        where.expirationDate = {
          lte: today,
        };
        this.logger.debug('Filtrando productos expirados');
      } else if (status === 'expiring-soon') {
        where.remainingQuantity = {
          gt: 0,
        };
        where.expirationDate = {
          gte: today,
          lte: futureDate,
        };
        this.logger.debug('Filtrando productos por expirar');
      }

      Object.keys(where).forEach(
        (key) => where[key] === undefined && delete where[key],
      );

      const totalItems = await this.prisma.movement.count({ where });
      this.logger.debug(`Total de items encontrados: ${totalItems}`);

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
      this.logger.debug(`Movimientos recuperados: ${expiringMovements.length}`);

      const formattedExpiringMovements = expiringMovements.map((m) => ({
        ...m,
        productName: m.item?.name,
        productId: m.item?.id,
        isExpired: m.expirationDate ? isPast(m.expirationDate) : false,
        item: undefined,
      }));

      this.logger.log('Reporte de stock por expirar generado exitosamente');
      return {
        data: formattedExpiringMovements,
        total: totalItems,
        page,
        pageSize,
        totalPages: Math.ceil(totalItems / pageSize),
      };
    } catch (error) {
      this.logger.error(
        `Error al generar reporte de stock por expirar: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException({
        message: 'Error al generar reporte de stock por expirar',
        technicalMessage: error.message,
      });
    }
  }
}
