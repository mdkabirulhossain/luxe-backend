/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaClientService } from '../../prisma-client/prisma-client.service';

@Injectable()
export class WishlistService {
  private readonly logger = new Logger(WishlistService.name);

  constructor(private readonly prisma: PrismaClientService) {}

  /**
   * Format Wishlist object to match high-level frontend interfaces with product & category details
   */
  private formatWishlistResponse(wishlist: any) {
    if (!wishlist) return null;

    const formattedItems = (wishlist.items || []).map((item: any) => {
      const p = item.product;
      const primaryImage = p?.images && p.images.length > 0 ? p.images[0] : '';

      return {
        id: item.id,
        wishlistId: item.wishlistId,
        productId: item.productId,
        createdAt: item.createdAt,
        product: p
          ? {
              id: p.id,
              name: p.name,
              title: p.name,
              slug: p.slug,
              sku: p.sku || '',
              price: p.price,
              originalPrice: p.originalPrice ?? null,
              discount: p.discount ?? 0,
              images: p.images || [],
              image: primaryImage,
              stock: p.stock,
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
            }
          : null,
      };
    });

    return {
      id: wishlist.id,
      userId: wishlist.userId,
      totalItems: formattedItems.length,
      items: formattedItems,
      createdAt: wishlist.createdAt,
      updatedAt: wishlist.updatedAt,
    };
  }

  /**
   * Retrieves or initializes the current user's wishlist with full product & category details.
   */
  async getWishlist(userId: string) {
    let wishlist = await this.prisma.wishlist.findUnique({
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

    if (!wishlist) {
      wishlist = await this.prisma.wishlist.create({
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

    return this.formatWishlistResponse(wishlist);
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

    // 3. Check if product is already in the wishlist
    const existingItem = await this.prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId,
        },
      },
    });
    if (existingItem) {
      throw new BadRequestException(`Product "${product.name}" is already in your wishlist`);
    }

    // 4. Create wishlist item
    await this.prisma.wishlistItem.create({
      data: {
        wishlistId: wishlist.id,
        productId,
      },
    });

    // 5. Return updated wishlist
    return this.getWishlist(userId);
  }

  /**
   * Toggles a product in the user's wishlist (adds if absent, removes if present).
   * Perfect for single heart-icon toggle buttons on product cards.
   */
  async toggleWishlist(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found`);
    }

    let wishlist = await this.prisma.wishlist.findUnique({
      where: { userId },
    });
    if (!wishlist) {
      wishlist = await this.prisma.wishlist.create({
        data: { userId },
      });
    }

    const existingItem = await this.prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId,
        },
      },
    });

    if (existingItem) {
      await this.prisma.wishlistItem.delete({
        where: {
          wishlistId_productId: {
            wishlistId: wishlist.id,
            productId,
          },
        },
      });

      const updatedWishlist = await this.getWishlist(userId);
      return {
        isWishlisted: false,
        message: `Product "${product.name}" removed from wishlist`,
        wishlist: updatedWishlist,
      };
    } else {
      await this.prisma.wishlistItem.create({
        data: {
          wishlistId: wishlist.id,
          productId,
        },
      });

      const updatedWishlist = await this.getWishlist(userId);
      return {
        isWishlisted: true,
        message: `Product "${product.name}" added to wishlist`,
        wishlist: updatedWishlist,
      };
    }
  }

  /**
   * Checks whether a specific product is in the user's wishlist.
   */
  async checkWishlistStatus(userId: string, productId: string) {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { userId },
    });

    if (!wishlist) {
      return { isWishlisted: false };
    }

    const existingItem = await this.prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId,
        },
      },
    });

    return { isWishlisted: !!existingItem };
  }

  /**
   * Removes a product from the user's wishlist.
   */
  async removeFromWishlist(userId: string, productId: string) {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { userId },
    });
    if (!wishlist) {
      throw new NotFoundException('Wishlist not found');
    }

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

    await this.prisma.wishlistItem.delete({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId,
        },
      },
    });

    return this.getWishlist(userId);
  }

  /**
   * Clears all items from the user's wishlist.
   */
  async clearWishlist(userId: string) {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { userId },
    });
    if (!wishlist) {
      throw new NotFoundException('Wishlist not found');
    }

    await this.prisma.wishlistItem.deleteMany({
      where: {
        wishlistId: wishlist.id,
      },
    });

    return this.getWishlist(userId);
  }
}
