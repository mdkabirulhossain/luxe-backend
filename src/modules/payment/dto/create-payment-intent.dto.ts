/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePaymentIntentDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6',
    description: 'UUID of the order to create payment intent for',
  })
  @IsUUID()
  @IsNotEmpty()
  orderId!: string;

  @ApiProperty({
    example: 'usd',
    description: 'Currency code for payment (default: usd)',
    required: false,
    default: 'usd',
  })
  @IsString()
  @IsOptional()
  currency?: string;
}
