/* eslint-disable prettier/prettier */
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaClientService implements OnModuleInit, OnModuleDestroy {
  private readonly prisma: PrismaClient;

  constructor(private readonly configService: ConfigService) {
    const connectionString = this.configService.getOrThrow<string>('DATABASE_URL');
    const adapter = new PrismaPg({ connectionString });
    this.prisma = new PrismaClient({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.prisma.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }

  /**
   * Returns the underlying PrismaClient instance.
   * Use this in other services to access database models.
   */
  getClient(): PrismaClient {
    return this.prisma;
  }
}