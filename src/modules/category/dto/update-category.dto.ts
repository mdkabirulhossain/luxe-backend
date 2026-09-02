/* eslint-disable prettier/prettier */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { CreateSubCategoryDto } from './create-category.dto';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Clothing & Apparel', description: 'The display name of the category' })
  @IsString()
  @IsOptional()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: 'https://example.com/images/clothing.png', description: 'Optional image URL for the category' })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether the category is active and visible' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: [{ name: 'Men Fashion' }, { name: 'Women Fashion' }],
    description: 'Optional array of subcategory objects (with name) to add under this category',
    type: [CreateSubCategoryDto],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateSubCategoryDto)
  subcategories?: (CreateSubCategoryDto | string)[];
}
