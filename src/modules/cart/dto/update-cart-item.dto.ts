/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({ example: 2, description: 'Updated quantity of the item', required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  quantity?: number;

  @ApiProperty({ example: 'Royal Navy', description: 'Updated selected color variant', required: false })
  @IsString()
  @IsOptional()
  selectedColor?: string;

  @ApiProperty({ example: 'Royal Navy', description: 'Alias for selectedColor', required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ example: 'XL', description: 'Updated selected size variant', required: false })
  @IsString()
  @IsOptional()
  selectedSize?: string;

  @ApiProperty({ example: 'XL', description: 'Alias for selectedSize', required: false })
  @IsString()
  @IsOptional()
  size?: string;
}
