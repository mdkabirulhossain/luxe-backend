/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { PrismaClientService } from './prisma-client.service';

@Module({
  providers: [PrismaClientService]
})
export class PrismaClientModule {}
