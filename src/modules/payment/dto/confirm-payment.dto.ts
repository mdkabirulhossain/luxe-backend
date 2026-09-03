/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class ConfirmPaymentDto {
  @ApiProperty({
    example: 'pi_3Mtw4XLkdIwHu7ix28a3tLvW',
    description: 'Stripe PaymentIntent ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  paymentIntentId?: string;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6',
    description: 'UUID of the order (alternative to paymentIntentId)',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  orderId?: string;
}
