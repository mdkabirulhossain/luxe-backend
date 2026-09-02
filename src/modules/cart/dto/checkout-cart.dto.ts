/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ShippingAddressDto } from '../../order/dto/create-order.dto';

export class CheckoutCartDto {
  @ApiProperty({ type: ShippingAddressDto, description: 'Shipping address details' })
  @IsObject()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress!: ShippingAddressDto;

  @ApiProperty({ example: 'WELCOME10', description: 'Promotional coupon code for discount', required: false })
  @IsString()
  @IsOptional()
  couponCode?: string;

  @ApiProperty({ example: 'COD', description: 'Payment method (e.g. COD, STRIPE, CARD)', required: false, default: 'COD' })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({ example: 'Please leave package at the front door', description: 'Special delivery instructions', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
