/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6',
    description: 'The UUID of the product to add to the cart',
  })
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({ example: 1, description: 'Quantity of the product', default: 1, required: false })
  @IsInt()
  @IsPositive()
  @IsOptional()
  quantity?: number = 1;

  @ApiProperty({ example: 'Midnight Black', description: 'Selected color variant name or hex code', required: false })
  @IsString()
  @IsOptional()
  selectedColor?: string;

  @ApiProperty({ example: 'Midnight Black', description: 'Alias for selectedColor', required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ example: 'L', description: 'Selected size variant', required: false })
  @IsString()
  @IsOptional()
  selectedSize?: string;

  @ApiProperty({ example: 'L', description: 'Alias for selectedSize', required: false })
  @IsString()
  @IsOptional()
  size?: string;
}
