/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateReviewDto {
  @ApiProperty({
    example: 4,
    description: 'Updated rating score between 1 and 5 stars',
    minimum: 1,
    maximum: 5,
    required: false,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @ApiProperty({
    example: 'Updated review: Product works great after several weeks of daily use.',
    description: 'Updated review comment',
    required: false,
  })
  @IsString()
  @IsOptional()
  comment?: string;
}
