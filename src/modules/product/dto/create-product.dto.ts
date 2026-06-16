/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Sleek Leather Jacket', description: 'The display name of the product' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'Premium quality slim-fit black leather jacket', description: 'Optional description of the product', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 120.50, description: 'The regular retail price of the product' })
  @IsNumber()
  @IsPositive()
  price!: number;

  @ApiProperty({ example: 99.99, description: 'Optional discounted promotional price of the product', required: false })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  discountPrice?: number;

  @ApiProperty({ example: ['https://example.com/images/jacket-1.png', 'https://example.com/images/jacket-2.png'], description: 'Optional list of image URL links for the product', required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiProperty({ example: 50, description: 'Available quantity stock for sale', required: false, default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @ApiProperty({ example: true, description: 'Whether the product is active and purchasable', required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6', description: 'ID of the Category this product belongs to' })
  @IsUUID()
  @IsNotEmpty()
  categoryId!: string;
}
