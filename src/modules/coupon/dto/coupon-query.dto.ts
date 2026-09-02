/* eslint-disable prettier/prettier */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CouponQueryDto {
  @ApiPropertyOptional({ description: 'Search query for coupon code or description', example: 'WELCOME' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by active status', example: true })
  @Transform(({ value }: { value: any }) => (value === 'true' || value === true ? true : value === 'false' || value === false ? false : undefined))
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of items per page', example: 10, default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Sort field', example: 'createdAt', default: 'createdAt' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc' })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
