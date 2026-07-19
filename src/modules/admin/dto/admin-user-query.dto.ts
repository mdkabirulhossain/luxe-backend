/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, IsEnum, IsIn } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Role } from '@prisma/client';

export class AdminUserQueryDto {
  @ApiProperty({ example: 1, description: 'Page number for pagination', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ example: 10, description: 'Number of items per page', required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({ example: 'john', description: 'Search term for name, email or phone lookup', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ enum: Role, description: 'Filter users by role', required: false })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({ example: 'true', description: 'Filter by banned status', required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  isBanned?: boolean;

  @ApiProperty({ example: 'true', description: 'Filter by active status', required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  isActive?: boolean;

  @ApiProperty({ example: 'createdAt', description: 'Field to sort users by', required: false, default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiProperty({ example: 'desc', description: 'Sort direction (asc or desc)', required: false, default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
