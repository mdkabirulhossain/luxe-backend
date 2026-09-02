/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class ShippingAddressDto {
  @ApiProperty({ example: 'John Doe', description: 'Recipient full name', required: false })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({ example: '+1234567890', description: 'Recipient phone number', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'john@example.com', description: 'Recipient email address', required: false })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '123 Luxury Ave', description: 'Street address' })
  @IsString()
  @IsNotEmpty()
  street!: string;

  @ApiProperty({ example: 'Beverly Hills', description: 'City' })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiProperty({ example: 'California', description: 'State / Province', required: false })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ example: 'USA', description: 'Country' })
  @IsString()
  @IsNotEmpty()
  country!: string;

  @ApiProperty({ example: '90210', description: 'Postal / ZIP code', required: false })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiProperty({ example: '90210', description: 'Alias for postalCode', required: false })
  @IsString()
  @IsOptional()
  zipCode?: string;
}

export class CreateOrderItemDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6', description: 'UUID of the product' })
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({ example: 1, description: 'Quantity of the product' })
  @IsInt()
  @IsPositive()
  quantity!: number;

  @ApiProperty({ example: 'Midnight Black', description: 'Selected color variant name or code', required: false })
  @IsString()
  @IsOptional()
  selectedColor?: string;

  @ApiProperty({ example: 'Midnight Black', description: 'Alias for selectedColor', required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ example: 'L', description: 'Selected size variant', required: false })
  @IsString()
  @IsOptional()
  selectedSize?: string;

  @ApiProperty({ example: 'L', description: 'Alias for selectedSize', required: false })
  @IsString()
  @IsOptional()
  size?: string;
}

export class CreateOrderDto {
  @ApiProperty({ type: ShippingAddressDto, description: 'Shipping address details' })
  @IsObject()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress!: ShippingAddressDto;

  @ApiProperty({ type: [CreateOrderItemDto], description: 'List of items in the order' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @ApiProperty({ example: 'COD', description: 'Payment method (e.g. COD, STRIPE, CARD)', required: false, default: 'COD' })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({ example: 'Please deliver between 9 AM and 5 PM', description: 'Special order notes', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
