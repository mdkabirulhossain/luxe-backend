/* eslint-disable prettier/prettier */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class ProductQueryDto {
  @ApiPropertyOptional({ description: 'Search term filtering by name, title, description, or SKU' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter products by main category UUID' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filter products by subcategory UUID' })
  @IsUUID()
  @IsOptional()
  subCategoryId?: string;

  @ApiPropertyOptional({ description: 'Filter products by Best Seller flag (true/false)' })
  @IsString()
  @IsOptional()
  isBestSeller?: string;

  @ApiPropertyOptional({ description: 'Filter products by Hot flag (true/false)' })
  @IsString()
  @IsOptional()
  isHot?: string;

  @ApiPropertyOptional({ description: 'Filter products by New flag (true/false)' })
  @IsString()
  @IsOptional()
  isNew?: string;

  @ApiPropertyOptional({ description: 'Filter by inStock status (true/false)' })
  @IsString()
  @IsOptional()
  inStock?: string;

  @ApiPropertyOptional({ description: 'Filter products with price greater than or equal to this' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Filter products with price less than or equal to this' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Filter by active status (true/false)' })
  @IsString()
  @IsOptional()
  isActive?: string;

  @ApiPropertyOptional({ description: 'Page number for pagination (defaults to 1)', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page (defaults to 10)', default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Field to sort products by', default: 'createdAt', enum: ['name', 'price', 'stock', 'rating', 'createdAt'] })
  @IsString()
  @IsIn(['name', 'price', 'stock', 'rating', 'createdAt'])
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sorting order direction', default: 'desc', enum: ['asc', 'desc'] })
  @IsString()
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
