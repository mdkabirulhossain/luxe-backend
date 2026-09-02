import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { PrismaClientModule } from '../../prisma-client/prisma-client.module';
import { CouponModule } from '../coupon/coupon.module';

@Module({
  imports: [PrismaClientModule, CouponModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
