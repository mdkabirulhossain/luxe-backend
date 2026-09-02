/* eslint-disable prettier/prettier */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class ReviewQueryDto {
  @ApiPropertyOptional({
    description: 'Filter reviews by specific product UUID',
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6',
  })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({ description: 'Page number for pagination', example: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of reviews per page', example: 10, default: 10 })
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
