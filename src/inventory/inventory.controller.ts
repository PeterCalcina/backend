import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  ParseIntPipe,
  HttpStatus,
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
  async createInventory(
    @Body() createInventoryDto: CreateInventoryDto,
    @User('id') userId: string,
  ) {
    const item = await this.inventoryService.createInventory(createInventoryDto, userId);
    return successResponse(item, 'Producto creado correctamente', HttpStatus.CREATED);
  }

  @Get()
  async findAll(@User('id') userId: string) {
    const items = await this.inventoryService.findAll(userId);
    return successResponse(items, 'Productos listados correctamente');
  }

  @Get('/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const item = await this.inventoryService.findOne(id);
    return successResponse(item, 'Producto encontrado');
  }

  @Patch('/:id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateInventoryDto: UpdateInventoryDto,
  ) {
    const item = await this.inventoryService.update(id, updateInventoryDto);
    return successResponse(item, 'Producto actualizado', HttpStatus.OK);
  }

  @Delete('/:id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const item = await this.inventoryService.delete(id);
    return successResponse(item, 'Producto eliminado', HttpStatus.OK);
  }
}
