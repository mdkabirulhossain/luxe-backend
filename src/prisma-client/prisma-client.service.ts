/* eslint-disable prettier/prettier */
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaClientService implements OnModuleInit, OnModuleDestroy {
  private readonly client: PrismaClient;

  constructor(private readonly configService: ConfigService) {
    const connectionString = this.configService.getOrThrow<string>('DATABASE_URL');
    const adapter = new PrismaPg({ connectionString });
    this.client = new PrismaClient({ adapter });
  }

  // Expose the full typed client
  get db(): PrismaClient {
    return this.client;
  }

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}