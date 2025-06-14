import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { GetCurrentStockDto } from './dtos/get-current-stock.dto';
import { successResponse } from 'src/common/responses/success-response';
import { GetMovementHistoryDto } from './dtos/get-movement-history.dto';
import { GetExpiringStockDto } from './dtos/get-expiring-stock.dto';
import { User } from 'src/auth/user.decorator';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('current-stock')
  async getCurrentStock(@User('id') userId: string, @Query() query: GetCurrentStockDto) {
    const result = await this.reportsService.getCurrentStockDto(query, userId);
    return successResponse(result, 'Stock actual obtenido correctamente');
  }

  @Get('movement-history')
  async getMovementHistory(@User('id') userId: string, @Query() query: GetMovementHistoryDto) {
    const result = await this.reportsService.getMovementHistory(query, userId);
    return successResponse(
      result,
      'Historial de movimientos obtenido correctamente',
    );
  }

  @Get('expiring-stock')
  async getExpiringStock(@User('id') userId: string, @Query() query: GetExpiringStockDto) {
    const result = await this.reportsService.getExpiringStock(query, userId);
    return successResponse(
      result,
      'Stock expirando obtenido correctamente',
    );
  }
}
