/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class ValidateCouponDto {
  @ApiProperty({
    example: 'WELCOME10',
    description: 'Coupon code to validate',
  })
  @Transform(({ value }: { value: string }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({
    example: 100,
    description: 'Current order subtotal amount to check against minimum purchase requirements',
  })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  orderAmount!: number;
}
