/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaClientModule } from '../../prisma-client/prisma-client.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    PrismaClientModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'fallbackSecret',
      signOptions: { expiresIn: '1d' }, // token expires in 1 day
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}