/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { PrismaClientModule } from '../../prisma-client/prisma-client.module';
import { CouponModule } from '../coupon/coupon.module';

@Module({
  imports: [PrismaClientModule, CouponModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
