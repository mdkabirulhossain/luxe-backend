/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsObject, IsPositive, IsString, IsUUID, ValidateNested } from 'class-validator';

export class ShippingAddressDto {
  @ApiProperty({ example: '123 Luxury Ave', description: 'Street address' })
  @IsString()
  @IsNotEmpty()
  street!: string;

  @ApiProperty({ example: 'Beverly Hills', description: 'City' })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiProperty({ example: 'USA', description: 'Country' })
  @IsString()
  @IsNotEmpty()
  country!: string;

  @ApiProperty({ example: '90210', description: 'Postal code' })
  @IsString()
  @IsNotEmpty()
  postalCode!: string;
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
}
