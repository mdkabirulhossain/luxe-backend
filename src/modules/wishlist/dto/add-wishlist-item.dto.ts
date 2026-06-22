import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddWishlistItemDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6',
    description: 'The UUID of the product to add to the wishlist',
  })
  @IsUUID()
  @IsNotEmpty()
  productId!: string;
}
