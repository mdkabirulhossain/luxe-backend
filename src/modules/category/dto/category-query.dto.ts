/* eslint-disable prettier/prettier */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CategoryQueryDto {
  @ApiPropertyOptional({ description: 'Search term for category name or description' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by active status (true/false)' })
  @IsString()
  @IsOptional()
  isActive?: string;

  @ApiPropertyOptional({ description: 'Fetch only top-level root categories (true/false)' })
  @IsString()
  @IsOptional()
  rootsOnly?: string;

  @ApiPropertyOptional({ description: 'Format categories as a nested tree hierarchy (true/false)' })
  @IsString()
  @IsOptional()
  tree?: string;

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

  @ApiPropertyOptional({ description: 'Field to sort categories by', default: 'name', enum: ['name', 'createdAt'] })
  @IsString()
  @IsIn(['name', 'createdAt'])
  @IsOptional()
  sortBy?: string = 'name';

  @ApiPropertyOptional({ description: 'Sorting order direction', default: 'asc', enum: ['asc', 'desc'] })
  @IsString()
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'asc';
}
