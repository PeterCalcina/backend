import { Module } from '@nestjs/common';
import { InventoryModule } from './inventory/inventory.module';
import { MovementModule } from './movements/movement.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    AuthModule,
    InventoryModule,
    MovementModule,
    PrismaModule,
  ],
})
export class AppModule {}
