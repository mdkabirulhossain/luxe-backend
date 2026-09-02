/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { DiscountType } from '@prisma/client';

export class CreateCouponDto {
  @ApiProperty({
    example: 'WELCOME10',
    description: 'Unique uppercase coupon promo code',
  })
  @Transform(({ value }: { value: string }) => (typeof value === 'string' ? value.toUpperCase().trim() : value))
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({
    example: '10% Welcome discount for new customers',
    description: 'Description of the coupon promotion',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    enum: DiscountType,
    example: DiscountType.PERCENTAGE,
    description: 'Type of discount: PERCENTAGE or FIXED_AMOUNT',
    default: DiscountType.PERCENTAGE,
  })
  @IsEnum(DiscountType)
  @IsOptional()
  discountType?: DiscountType = DiscountType.PERCENTAGE;

  @ApiProperty({
    example: 10,
    description: 'Percentage discount (e.g. 10 for 10%) or fixed amount (e.g. 15 for $15 off)',
  })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  discountValue!: number;

  @ApiProperty({
    example: 50,
    description: 'Minimum subtotal order amount required to activate coupon',
    required: false,
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minOrderAmount?: number = 0;

  @ApiProperty({
    example: 20,
    description: 'Maximum discount limit amount for percentage coupons',
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxDiscountAmount?: number;

  @ApiProperty({
    example: '2026-09-01T00:00:00.000Z',
    description: 'Coupon valid start date',
    required: false,
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  startDate?: Date;

  @ApiProperty({
    example: '2026-12-31T23:59:59.000Z',
    description: 'Coupon expiration end date',
    required: false,
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endDate?: Date;

  @ApiProperty({
    example: 1000,
    description: 'Total global maximum number of times coupon can be redeemed',
    required: false,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  usageLimit?: number;

  @ApiProperty({
    example: 1,
    description: 'Maximum redemptions allowed per individual user',
    required: false,
    default: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  userLimit?: number = 1;

  @ApiProperty({
    example: true,
    description: 'Whether coupon is active and usable',
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
