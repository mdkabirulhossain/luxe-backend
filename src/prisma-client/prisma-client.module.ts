/* eslint-disable prettier/prettier */
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaClientService } from './prisma-client.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [PrismaClientService],
  exports: [PrismaClientService],
})
export class PrismaClientModule { }


