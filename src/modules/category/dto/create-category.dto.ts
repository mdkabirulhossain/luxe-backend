/* eslint-disable prettier/prettier */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested, MinLength } from 'class-validator';

export class CreateSubCategoryDto {
  @ApiPropertyOptional({ example: '3f9188a1-052b-4d92-801e-cd124b899aef', description: 'Optional subcategory ID if referencing or updating an existing subcategory' })
  @IsUUID()
  @IsOptional()
  id?: string;

  @ApiProperty({ example: 'Men Fashion', description: 'Name of the subcategory' })
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class CreateCategoryDto {
  @ApiProperty({ example: 'Clothing & Apparel', description: 'The display name of the category' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: 'https://example.com/images/clothing.png', description: 'Optional image URL for the category' })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether the category is active and visible', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: [{ name: 'Men Fashion' }, { name: 'Women Fashion' }],
    description: 'Optional array of subcategory objects (with name) to create under this category',
    type: [CreateSubCategoryDto],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateSubCategoryDto)
  subcategories?: (CreateSubCategoryDto | string)[];
}
