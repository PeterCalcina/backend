import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  ParseIntPipe,
} from '@nestjs/common';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { InventoryService } from './inventory.service';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { User } from 'src/auth/user.decorator';
import { successResponse } from 'src/common/responses/success-response';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  createInventory(
    @Body() createInventoryDto: CreateInventoryDto,
    @User('id') userId: string,
  ) {
    return this.inventoryService.createInventory(createInventoryDto, userId);
  }

  @Get()
  findAll(@User('id') userId: string) {
    return this.inventoryService.findAll(userId);
  }

  @Get('/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const item = await this.inventoryService.findOne(id);
    return successResponse(item, 'Inventario encontrado');
  }

  @Patch('/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateInventoryDto: UpdateInventoryDto,
  ) {
    return this.inventoryService.update(id, updateInventoryDto);
  }

  @Delete('/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.delete(id);
  }
}
