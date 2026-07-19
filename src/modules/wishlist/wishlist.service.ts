/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClientService } from '../../prisma-client/prisma-client.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaClientService) {}

  /**
   * Retrieves the current user's wishlist.
   * If the wishlist does not exist yet in the database, it initializes it automatically.
   */
  async getWishlist(userId: string) {
    let wishlist = await this.prisma.wishlist.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!wishlist) {
      wishlist = await this.prisma.wishlist.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    }

    return wishlist;
  }

  /**
   * Adds a product to the user's wishlist.
   */
  async addToWishlist(userId: string, productId: string) {
    // 1. Verify that the product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found`);
    }

    // 2. Fetch or create the user's wishlist
    let wishlist = await this.prisma.wishlist.findUnique({
      where: { userId },
    });
    if (!wishlist) {
      wishlist = await this.prisma.wishlist.create({
        data: { userId },
      });
    }

    // 3. Check if the product is already in the wishlist
    const existingItem = await this.prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId,
        },
      },
    });
    if (existingItem) {
      throw new BadRequestException('Product is already in your wishlist');
    }

    // 4. Create and return the new wishlist item
    return this.prisma.wishlistItem.create({
      data: {
        wishlistId: wishlist.id,
        productId,
      },
      include: {
        product: true,
      },
    });
  }

  /**
   * Removes a product from the user's wishlist.
   */
  async removeFromWishlist(userId: string, productId: string) {
    // 1. Fetch user's wishlist
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { userId },
    });
    if (!wishlist) {
      throw new NotFoundException('Wishlist not found');
    }

    // 2. Verify that the item exists in the wishlist
    const existingItem = await this.prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId,
        },
      },
    });
    if (!existingItem) {
      throw new NotFoundException('Product not found in your wishlist');
    }

    // 3. Delete the item
    await this.prisma.wishlistItem.delete({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId,
        },
      },
    });

    return { message: 'Product removed from wishlist successfully' };
  }

  /**
   * Clears all items from the user's wishlist.
   */
  async clearWishlist(userId: string) {
    // 1. Fetch user's wishlist
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { userId },
    });
    if (!wishlist) {
      throw new NotFoundException('Wishlist not found');
    }

    // 2. Delete all wishlist items
    await this.prisma.wishlistItem.deleteMany({
      where: {
        wishlistId: wishlist.id,
      },
    });

    return { message: 'Wishlist cleared successfully' };
  }
}
