/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CheckoutCartDto } from './dto/checkout-cart.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@ApiTags('Cart')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ResponseMessage('Cart retrieved successfully')
  @ApiOperation({ summary: "Get current user's shopping cart with full product & category details" })
  @ApiResponse({ status: 200, description: 'Cart retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized: Missing or invalid token.' })
  async getCart(@Request() req: AuthenticatedRequest) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('User session not found');
    }
    return this.cartService.getCart(userId);
  }

  @Post()
  @ResponseMessage('Item added to cart successfully')
  @ApiOperation({ summary: 'Add a product to cart with selected color & size variants' })
  @ApiResponse({ status: 201, description: 'Product successfully added to cart.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Insufficient stock or product inactive.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Not Found: Product not found.' })
  async addToCart(@Request() req: AuthenticatedRequest, @Body() addCartItemDto: AddCartItemDto) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('User session not found');
    }
    return this.cartService.addToCart(userId, addCartItemDto);
  }

  @Patch('item/:itemId')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Cart item updated successfully')
  @ApiOperation({ summary: 'Update cart item quantity or variant choices (color & size)' })
  @ApiResponse({ status: 200, description: 'Cart item successfully updated.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Quantity exceeds stock.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Item does not belong to user.' })
  @ApiResponse({ status: 404, description: 'Not Found: Cart item not found.' })
  async updateCartItem(
    @Request() req: AuthenticatedRequest,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('User session not found');
    }
    return this.cartService.updateCartItem(userId, itemId, updateCartItemDto);
  }

  @Delete('item/:itemId')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Item removed from cart successfully')
  @ApiOperation({ summary: 'Remove a specific item from the cart' })
  @ApiResponse({ status: 200, description: 'Item successfully removed from cart.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Not Found: Cart item not found.' })
  async removeFromCart(
    @Request() req: AuthenticatedRequest,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('User session not found');
    }
    return this.cartService.removeFromCart(userId, itemId);
  }

  @Delete('clear')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Cart cleared successfully')
  @ApiOperation({ summary: 'Clear all items from the user shopping cart' })
  @ApiResponse({ status: 200, description: 'Cart successfully cleared.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Not Found: Cart not found.' })
  async clearCart(@Request() req: AuthenticatedRequest) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('User session not found');
    }
    return this.cartService.clearCart(userId);
  }

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Order placed successfully from shopping cart')
  @ApiOperation({ summary: 'Checkout all items in user shopping cart and place order' })
  @ApiResponse({ status: 201, description: 'Cart order successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Empty cart or out of stock items.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async checkoutCart(
    @Request() req: AuthenticatedRequest,
    @Body() checkoutCartDto: CheckoutCartDto,
  ) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('User session not found');
    }
    return this.cartService.checkoutCart(userId, checkoutCartDto);
  }
}
