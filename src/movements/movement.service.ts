import { Injectable } from '@nestjs/common';
import { CreateMovementDto } from './dto/movements.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MovementService {
  constructor(private readonly prisma: PrismaService) {}

  async createMovement(createMovementDto: CreateMovementDto) {
    return this.prisma.movement.create({
      data: createMovementDto,
    });
  }
}