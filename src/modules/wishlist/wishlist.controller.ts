/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

interface AuthenticatedRequest extends Express.Request {
  user?: {
    sub: string;
    email?: string;
    role?: string;
  };
}

@ApiTags('Wishlist')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user\'s wishlist' })
  @ApiResponse({ status: 200, description: 'Wishlist retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized: Missing or invalid token.' })
  async getWishlist(@Request() req: AuthenticatedRequest) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('User session not found');
    }
    return this.wishlistService.getWishlist(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a product to the wishlist' })
  @ApiResponse({ status: 201, description: 'Product successfully added to wishlist.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Product is already in wishlist or invalid UUID.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Not Found: Product not found.' })
  async addToWishlist(@Request() req: AuthenticatedRequest, @Body() addWishlistItemDto: AddWishlistItemDto) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('User session not found');
    }
    return this.wishlistService.addToWishlist(userId, addWishlistItemDto.productId);
  }

  @Delete('clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all items from the wishlist' })
  @ApiResponse({ status: 200, description: 'Wishlist successfully cleared.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Not Found: Wishlist not found.' })
  async clearWishlist(@Request() req: AuthenticatedRequest) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('User session not found');
    }
    return this.wishlistService.clearWishlist(userId);
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a product from the wishlist' })
  @ApiResponse({ status: 200, description: 'Product successfully removed from wishlist.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Not Found: Product or wishlist not found.' })
  async removeFromWishlist(@Request() req: AuthenticatedRequest, @Param('productId') productId: string) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('User session not found');
    }
    return this.wishlistService.removeFromWishlist(userId, productId);
  }
}
