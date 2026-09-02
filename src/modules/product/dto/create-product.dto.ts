/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ColorVariantDto {
  @ApiProperty({ example: 'v-1', description: 'Unique identifier for variant' })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ example: 'Midnight Black', description: 'Variant color name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'bg-black', description: 'Tailwind CSS color class', required: false })
  @IsString()
  @IsOptional()
  colorClass?: string;

  @ApiProperty({ example: '#000000', description: 'Hex code for color preview', required: false })
  @IsString()
  @IsOptional()
  hex?: string;

  @ApiProperty({ example: 'https://example.com/images/jacket-black.jpg', description: 'Variant specific image URL', required: false })
  @IsString()
  @IsOptional()
  image?: string;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Sleek Leather Jacket', description: 'Product title / name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'Sleek Leather Jacket', description: 'Alternative alias for name', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ example: 'SLJ-2026-BLK', description: 'Stock Keeping Unit unique code', required: false })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiProperty({ example: 'Premium quality slim-fit black leather jacket', description: 'Detailed product overview & specifications', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 120.50, description: 'Active retail price of the product' })
  @IsNumber()
  @IsPositive()
  price!: number;

  @ApiProperty({ example: 149.99, description: 'Regular price before discount', required: false })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  originalPrice?: number;

  @ApiProperty({ example: 149.99, description: 'Legacy alias for originalPrice', required: false })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  discountPrice?: number;

  @ApiProperty({ example: 20, description: 'Explicit percentage discount value (0-100)', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  discount?: number;

  @ApiProperty({ example: ['https://example.com/images/jacket-1.png', 'https://example.com/images/jacket-2.png'], description: 'Main image gallery list for thumbnails', required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiProperty({ example: 50, description: 'Available quantity stock for sale', required: false, default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @ApiProperty({ example: 50, description: 'Alias for stock', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  stockQuantity?: number;

  @ApiProperty({ example: true, description: 'Availability status (auto-computed from stock > 0 if omitted)', required: false })
  @IsBoolean()
  @IsOptional()
  inStock?: boolean;

  @ApiProperty({ example: true, description: 'Whether the product is active and purchasable', required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: false, description: 'Best seller promotional flag', required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isBestSeller?: boolean;

  @ApiProperty({ example: true, description: 'Trending / hot promotional flag', required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isHot?: boolean;

  @ApiProperty({ example: true, description: 'New arrival promotional flag', required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isNew?: boolean;

  @ApiProperty({ example: ['Black', 'Brown'], description: 'Available color names or hexes', required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  colors?: string[];

  @ApiProperty({ example: [{ id: 'v1', name: 'Black', hex: '#000000', image: 'https://example.com/b.jpg' }], description: 'Full color variants mapping', required: false, type: [ColorVariantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ColorVariantDto)
  @IsOptional()
  colorVariants?: ColorVariantDto[];

  @ApiProperty({ example: ['S', 'M', 'L', 'XL'], description: 'Available size list', required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  sizes?: string[];

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6', description: 'ID of the Main Category' })
  @IsUUID()
  @IsNotEmpty()
  categoryId!: string;

  @ApiProperty({ example: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', description: 'ID of the Subcategory (optional)', required: false })
  @IsUUID()
  @IsOptional()
  subCategoryId?: string;
}
