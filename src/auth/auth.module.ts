import { Module } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategy/jwt-strategy';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [JwtAuthGuard, JwtStrategy],
  exports: [JwtAuthGuard, PassportModule],
})
export class AuthModule {}
