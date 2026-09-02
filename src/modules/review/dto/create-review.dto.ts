/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6',
    description: 'UUID of the purchased product to review',
  })
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({
    example: 5,
    description: 'Rating score between 1 and 5 stars',
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  rating!: number;

  @ApiProperty({
    example: 'Exceptional build quality and premium luxury feel! Highly recommended.',
    description: 'Review feedback comment',
    required: false,
  })
  @IsString()
  @IsOptional()
  comment?: string;
}
