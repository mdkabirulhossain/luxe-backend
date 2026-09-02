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
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@ApiTags('Wishlist')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ResponseMessage('Wishlist retrieved successfully')
  @ApiOperation({ summary: "Get current user's wishlist with full product & category details" })
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
  @ResponseMessage('Product added to wishlist successfully')
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

  @Post('toggle')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Wishlist status toggled successfully')
  @ApiOperation({ summary: 'Toggle product in wishlist (adds if missing, removes if present)' })
  @ApiResponse({ status: 200, description: 'Wishlist status successfully toggled.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Not Found: Product not found.' })
  async toggleWishlist(@Request() req: AuthenticatedRequest, @Body() addWishlistItemDto: AddWishlistItemDto) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('User session not found');
    }
    return this.wishlistService.toggleWishlist(userId, addWishlistItemDto.productId);
  }

  @Get('check/:productId')
  @ResponseMessage('Wishlist check completed successfully')
  @ApiOperation({ summary: 'Check if a specific product is in the user wishlist' })
  @ApiResponse({ status: 200, description: 'Wishlist status returned successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async checkWishlistStatus(@Request() req: AuthenticatedRequest, @Param('productId') productId: string) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('User session not found');
    }
    return this.wishlistService.checkWishlistStatus(userId, productId);
  }

  @Delete('clear')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Wishlist cleared successfully')
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
  @ResponseMessage('Product removed from wishlist successfully')
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
