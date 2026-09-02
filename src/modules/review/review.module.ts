/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { PrismaClientModule } from '../../prisma-client/prisma-client.module';

@Module({
  imports: [PrismaClientModule],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
