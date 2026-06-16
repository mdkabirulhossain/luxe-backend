/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Clothing & Apparel', description: 'The display name of the category' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'Men and women designer clothes', description: 'Optional description of the category', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'https://example.com/images/clothing.png', description: 'Optional image URL for the category', required: false })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiProperty({ example: true, description: 'Whether the category is active and visible', required: false, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6', description: 'Optional ID of the parent category if this is a subcategory', required: false })
  @IsUUID()
  @IsOptional()
  parentId?: string;
}
