/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { CouponController } from './coupon.controller';
import { CouponService } from './coupon.service';
import { PrismaClientModule } from '../../prisma-client/prisma-client.module';

@Module({
  imports: [PrismaClientModule],
  controllers: [CouponController],
  providers: [CouponService],
  exports: [CouponService],
})
export class CouponModule {}
