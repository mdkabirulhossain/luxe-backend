/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaClientService } from '../../prisma-client/prisma-client.service';
import { CouponService } from '../coupon/coupon.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CheckoutCartDto } from './dto/checkout-cart.dto';
import { OrderStatus, Prisma } from '@prisma/client';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private readonly prisma: PrismaClientService,
    private readonly couponService: CouponService,
  ) {}

  /**
   * Helper to verify if id matches UUID pattern.
   */
  private isUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  /**
   * Format Cart object to match high-level frontend interfaces with product & category details
   */
  private formatCartResponse(cart: any) {
    if (!cart) return null;

    let subtotalAmount = 0;
    let totalItems = 0;

    const formattedItems = (cart.items || []).map((item: any) => {
      const p = item.product;
      const primaryImage = p?.images && p.images.length > 0 ? p.images[0] : '';
      const unitPrice = p?.price ?? 0;
      const itemSubtotal = Number((unitPrice * item.quantity).toFixed(2));

      subtotalAmount += itemSubtotal;
      totalItems += item.quantity;

      return {
        id: item.id,
        cartId: item.cartId,
        productId: item.productId,
        quantity: item.quantity,
        price: unitPrice,
        subtotal: itemSubtotal,
        selectedColor: item.selectedColor || null,
        selectedSize: item.selectedSize || null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        product: p
          ? {
              id: p.id,
              name: p.name,
              title: p.name,
              slug: p.slug,
              sku: p.sku || '',
              description: p.description || '',
              price: p.price,
              currentPrice: p.price,
              originalPrice: p.originalPrice ?? null,
              discount: p.discount ?? 0,
              images: p.images || [],
              image: primaryImage,
              stock: p.stock,
              stockQuantity: p.stock,
              inStock: p.inStock,
              isActive: p.isActive,
              isBestSeller: p.isBestSeller,
              isHot: p.isHot,
              isNew: p.isNew,
              colors: p.colors || [],
              colorVariants: p.colorVariants || [],
              sizes: p.sizes || [],
              rating: p.rating,
              reviewsCount: p.reviewsCount,
              categoryId: p.categoryId,
              category: p.category?.name || '',
              categoryDetails: p.category
                ? {
                    id: p.category.id,
                    name: p.category.name,
                    slug: p.category.slug,
                  }
                : null,
              subCategoryId: p.subCategoryId || null,
              subCategory: p.subCategory
                ? {
                    id: p.subCategory.id,
                    name: p.subCategory.name,
                    slug: p.subCategory.slug,
                  }
                : null,
              createdAt: p.createdAt,
              updatedAt: p.updatedAt,
            }
          : null,
      };
    });

    return {
      id: cart.id,
      userId: cart.userId,
      totalItems,
      subtotalAmount: Number(subtotalAmount.toFixed(2)),
      totalAmount: Number(subtotalAmount.toFixed(2)),
      items: formattedItems,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }

  /**
   * Format Order response object (consistent with OrderService)
   */
  private formatOrderResponse(order: any) {
    if (!order) return null;

    const formattedItems = (order.items || []).map((item: any) => {
      const p = item.product;
      const primaryImage = p?.images && p.images.length > 0 ? p.images[0] : '';

      return {
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        subtotal: Number((item.price * item.quantity).toFixed(2)),
        selectedColor: item.selectedColor || null,
        selectedSize: item.selectedSize || null,
        product: p
          ? {
              id: p.id,
              name: p.name,
              title: p.name,
              slug: p.slug,
              sku: p.sku || '',
              description: p.description || '',
              price: p.price,
              currentPrice: p.price,
              originalPrice: p.originalPrice ?? null,
              discount: p.discount ?? 0,
              images: p.images || [],
              image: primaryImage,
              stock: p.stock,
              stockQuantity: p.stock,
              inStock: p.inStock,
              isActive: p.isActive,
              isBestSeller: p.isBestSeller,
              isHot: p.isHot,
              isNew: p.isNew,
              colors: p.colors || [],
              colorVariants: p.colorVariants || [],
              sizes: p.sizes || [],
              rating: p.rating,
              reviewsCount: p.reviewsCount,
              categoryId: p.categoryId,
              category: p.category?.name || '',
              categoryDetails: p.category
                ? {
                    id: p.category.id,
                    name: p.category.name,
                    slug: p.category.slug,
                  }
                : null,
              subCategoryId: p.subCategoryId || null,
              subCategory: p.subCategory
                ? {
                    id: p.subCategory.id,
                    name: p.subCategory.name,
                    slug: p.subCategory.slug,
                  }
                : null,
              createdAt: p.createdAt,
              updatedAt: p.updatedAt,
            }
          : null,
      };
    });

    return {
      id: order.id,
      userId: order.userId,
      user: order.user
        ? {
            id: order.user.id,
            name: order.user.name,
            email: order.user.email,
            phone: order.user.phone || null,
            avatar: order.user.avatar || null,
          }
        : null,
      totalAmount: order.totalAmount,
      totalItems: formattedItems.reduce((acc: number, item: any) => acc + item.quantity, 0),
      status: order.status,
      shippingAddress: order.shippingAddress,
      items: formattedItems,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  /**
   * Retrieves or initializes the current user's cart with full product & category details.
   */
  async getCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          orderBy: { createdAt: 'desc' },
          include: {
            product: {
              include: {
                category: true,
                subCategory: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: true,
                  subCategory: true,
                },
              },
            },
          },
        },
      });
    }

    return this.formatCartResponse(cart);
  }

  /**
   * Adds a product item to the user's cart with selected color & size variants.
   */
  async addToCart(userId: string, addCartItemDto: AddCartItemDto) {
    const { productId } = addCartItemDto;
    const requestedQuantity = addCartItemDto.quantity ?? 1;
    const selectedColor = addCartItemDto.selectedColor || addCartItemDto.color || null;
    const selectedSize = addCartItemDto.selectedSize || addCartItemDto.size || null;

    if (!this.isUUID(productId)) {
      throw new BadRequestException('Invalid UUID format for productId');
    }

    // 1. Validate product existence & availability
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found`);
    }

    if (!product.isActive) {
      throw new BadRequestException(`Product "${product.name}" is currently inactive and cannot be added to cart`);
    }

    if (!product.inStock || product.stock < requestedQuantity) {
      throw new BadRequestException(
        `Insufficient stock for product "${product.name}". Available: ${product.stock}, requested: ${requestedQuantity}`,
      );
    }

    // 2. Fetch or create user cart
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
      });
    }

    // 3. Check for existing item with identical productId and variant choices (color & size)
    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        selectedColor,
        selectedSize,
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + requestedQuantity;
      if (newQuantity > product.stock) {
        throw new BadRequestException(
          `Cannot add ${requestedQuantity} more of "${product.name}". Total in cart (${newQuantity}) exceeds stock level (${product.stock}).`,
        );
      }

      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity: requestedQuantity,
          selectedColor,
          selectedSize,
        },
      });
    }

    // 4. Return updated cart
    return this.getCart(userId);
  }

  /**
   * Updates quantity or variant attributes of a specific cart item.
   */
  async updateCartItem(userId: string, itemId: string, updateCartItemDto: UpdateCartItemDto) {
    if (!this.isUUID(itemId)) {
      throw new BadRequestException('Invalid UUID format for itemId');
    }

    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
        product: true,
      },
    });

    if (!cartItem) {
      throw new NotFoundException(`Cart item with ID "${itemId}" not found`);
    }

    if (cartItem.cart.userId !== userId) {
      throw new ForbiddenException('You do not have permission to modify this cart item');
    }

    const updateData: any = {};

    if (updateCartItemDto.quantity !== undefined) {
      const requestedQuantity = updateCartItemDto.quantity;
      if (requestedQuantity > cartItem.product.stock) {
        throw new BadRequestException(
          `Requested quantity (${requestedQuantity}) exceeds available stock (${cartItem.product.stock})`,
        );
      }
      updateData.quantity = requestedQuantity;
    }

    const newColor = updateCartItemDto.selectedColor !== undefined 
      ? updateCartItemDto.selectedColor 
      : updateCartItemDto.color;
    if (newColor !== undefined) {
      updateData.selectedColor = newColor || null;
    }

    const newSize = updateCartItemDto.selectedSize !== undefined 
      ? updateCartItemDto.selectedSize 
      : updateCartItemDto.size;
    if (newSize !== undefined) {
      updateData.selectedSize = newSize || null;
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: updateData,
    });

    return this.getCart(userId);
  }

  /**
   * Removes a specific item from the user's cart.
   */
  async removeFromCart(userId: string, itemId: string) {
    if (!this.isUUID(itemId)) {
      throw new BadRequestException('Invalid UUID format for itemId');
    }

    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!cartItem) {
      throw new NotFoundException(`Cart item with ID "${itemId}" not found`);
    }

    if (cartItem.cart.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this cart item');
    }

    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    return this.getCart(userId);
  }

  /**
   * Clears all items from the user's cart.
   */
  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return this.getCart(userId);
  }

  /**
   * Performs Cart Checkout inside an atomic database transaction.
   * Validates stock, decrements inventory, creates Order & OrderItems, and empties the cart.
   */
  async checkoutCart(userId: string, checkoutCartDto: CheckoutCartDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch user's cart with items and product details
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!cart || !cart.items || cart.items.length === 0) {
        throw new BadRequestException('Your shopping cart is empty. Please add items before checking out.');
      }

      let subtotalAmount = 0;
      const resolvedOrderItems: {
        productId: string;
        quantity: number;
        price: number;
        selectedColor?: string | null;
        selectedSize?: string | null;
      }[] = [];

      // 2. Validate products and inventory levels
      for (const item of cart.items) {
        const product = item.product;

        if (!product) {
          throw new NotFoundException(`Product with ID "${item.productId}" no longer exists`);
        }

        if (!product.isActive) {
          throw new BadRequestException(`Product "${product.name}" in your cart is inactive and cannot be ordered`);
        }

        if (!product.inStock || product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${product.name}". Available: ${product.stock}, requested in cart: ${item.quantity}`,
          );
        }

        const itemPrice = product.price;
        subtotalAmount += itemPrice * item.quantity;

        resolvedOrderItems.push({
          productId: item.productId,
          quantity: item.quantity,
          price: itemPrice,
          selectedColor: item.selectedColor || null,
          selectedSize: item.selectedSize || null,
        });

        // 3. Decrement stock atomically & update inStock flag
        const updatedStock = product.stock - item.quantity;
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: updatedStock,
            inStock: updatedStock > 0,
          },
        });
      }

      // 3b. Validate & Apply Coupon Discount
      let appliedCouponCode: string | null = null;
      let discountAmount = 0;
      let couponId: string | null = null;

      if (checkoutCartDto.couponCode) {
        const couponResult = await this.couponService.validateCoupon(
          userId,
          checkoutCartDto.couponCode,
          subtotalAmount,
          tx,
        );
        appliedCouponCode = couponResult.code;
        discountAmount = couponResult.discountAmount;
        couponId = couponResult.couponId;
      }

      const finalTotalAmount = Number(Math.max(0, subtotalAmount - discountAmount).toFixed(2));

      // 4. Create Order and OrderItems
      const createdOrder = await tx.order.create({
        data: {
          userId,
          totalAmount: finalTotalAmount,
          couponCode: appliedCouponCode,
          discountAmount,
          status: OrderStatus.PENDING,
          shippingAddress: checkoutCartDto.shippingAddress as unknown as Prisma.InputJsonValue,
          items: {
            create: resolvedOrderItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              selectedColor: item.selectedColor || null,
              selectedSize: item.selectedSize || null,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: true,
                  subCategory: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatar: true,
            },
          },
        },
      });

      // 4b. Record Coupon Usage
      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        });

        await tx.couponUsage.create({
          data: {
            couponId,
            userId,
            orderId: createdOrder.id,
          },
        });
      }

      // 5. Empty user cart items after successful order creation
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return this.formatOrderResponse(createdOrder);
    });
  }
}
