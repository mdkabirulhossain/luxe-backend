/* eslint-disable prettier/prettier */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Clothing & Apparel', description: 'The display name of the category' })
  @IsString()
  @IsOptional()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: 'Men and women designer clothes', description: 'Optional description of the category' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/images/clothing.png', description: 'Optional image URL for the category' })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether the category is active and visible' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6', description: 'Optional ID of the parent category' })
  @IsUUID()
  @IsOptional()
  parentId?: string;
}

