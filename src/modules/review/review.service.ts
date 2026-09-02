/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaClientService } from '../../prisma-client/prisma-client.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { Role } from '@prisma/client';

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(private readonly prisma: PrismaClientService) {}

  /**
   * Helper to verify if id matches UUID pattern.
   */
  private isUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  /**
   * Automatically recalculates and updates the average rating and review count of a product.
   */
  async recalculateProductRating(productId: string, prismaClient: any = this.prisma): Promise<void> {
    const aggregate = await prismaClient.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const rawAvg = aggregate._avg.rating || 0;
    const avgRating = Math.round(rawAvg * 10) / 10;
    const reviewsCount = aggregate._count.rating || 0;

    await prismaClient.product.update({
      where: { id: productId },
      data: {
        rating: avgRating,
        reviewsCount,
      },
    });
  }

  /**
   * Format Review object with user & product details
   */
  private formatReviewResponse(review: any) {
    if (!review) return null;

    const p = review.product;
    const primaryImage = p?.images && p.images.length > 0 ? p.images[0] : '';

    return {
      id: review.id,
      userId: review.userId,
      user: review.user
        ? {
            id: review.user.id,
            name: review.user.name,
            avatar: review.user.avatar || null,
          }
        : null,
      productId: review.productId,
      product: p
        ? {
            id: p.id,
            name: p.name,
            slug: p.slug,
            image: primaryImage,
          }
        : null,
      rating: review.rating,
      comment: review.comment || '',
      isVerifiedPurchase: true,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  /**
   * Creates a review for a product.
   * Enforces VERIFIED PURCHASE: user can only leave a review if they have purchased the product.
   */
  async createReview(userId: string, createReviewDto: CreateReviewDto) {
    const { productId, rating, comment } = createReviewDto;

    if (!this.isUUID(productId)) {
      throw new BadRequestException('Invalid UUID format for productId');
    }

    // 1. Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found`);
    }

    // 2. VERIFIED PURCHASE CHECK: User must have an order containing this product
    const purchase = await this.prisma.orderItem.findFirst({
      where: {
        productId,
        order: {
          userId,
        },
      },
    });

    if (!purchase) {
      throw new ForbiddenException(
        `You can only write a review for products you have purchased. No purchase record found for product "${product.name}".`,
      );
    }

    // 3. Check for existing review (prevent duplicates per user per product)
    const existingReview = await this.prisma.review.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existingReview) {
      throw new ConflictException(
        `You have already submitted a review for "${product.name}". You can update your existing review instead.`,
      );
    }

    // 4. Create Review and recalculate Product rating
    return this.prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          userId,
          productId,
          rating,
          comment,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: true,
            },
          },
        },
      });

      await this.recalculateProductRating(productId, tx);

      return this.formatReviewResponse(review);
    });
  }

  /**
   * Retrieves paginated reviews with user info & optional product filtering.
   */
  async getReviews(query: ReviewQueryDto) {
    const { productId, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const where: any = {};

    if (productId) {
      if (!this.isUUID(productId)) {
        throw new BadRequestException('Invalid UUID format for productId');
      }
      where.productId = productId;
    }

    const skip = (page - 1) * limit;
    const take = limit;

    const total = await this.prisma.review.count({ where });

    const reviews = await this.prisma.review.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: true,
          },
        },
      },
    });

    const formattedReviews = reviews.map((r) => this.formatReviewResponse(r));

    return {
      data: formattedReviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves review statistics and star distribution breakdown for a product.
   */
  async getProductReviewStats(productId: string) {
    if (!this.isUUID(productId)) {
      throw new BadRequestException('Invalid UUID format for productId');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${productId}" not found`);
    }

    const reviews = await this.prisma.review.findMany({
      where: { productId },
      select: { rating: true },
    });

    const totalReviews = reviews.length;
    const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    reviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) {
        ratingCounts[r.rating]++;
      }
    });

    const breakdown: Record<number, { count: number; percentage: number }> = {};

    for (let star = 1; star <= 5; star++) {
      const count = ratingCounts[star] || 0;
      const percentage = totalReviews > 0 ? Number(((count / totalReviews) * 100).toFixed(1)) : 0;
      breakdown[star] = { count, percentage };
    }

    return {
      productId: product.id,
      productName: product.name,
      averageRating: product.rating,
      totalReviews: product.reviewsCount,
      breakdown,
    };
  }

  /**
   * Checks if the user is eligible to review a specific product.
   */
  async checkCanReview(userId: string, productId: string) {
    if (!this.isUUID(productId)) {
      throw new BadRequestException('Invalid UUID format for productId');
    }

    const purchase = await this.prisma.orderItem.findFirst({
      where: {
        productId,
        order: {
          userId,
        },
      },
    });

    const hasPurchased = !!purchase;

    const existingReview = await this.prisma.review.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: true,
          },
        },
      },
    });

    return {
      canReview: hasPurchased && !existingReview,
      hasPurchased,
      existingReview: existingReview ? this.formatReviewResponse(existingReview) : null,
    };
  }

  /**
   * Updates an existing review (Author or Admin).
   */
  async updateReview(userId: string, reviewId: string, updateReviewDto: UpdateReviewDto, role: Role) {
    if (!this.isUUID(reviewId)) {
      throw new BadRequestException('Invalid UUID format for reviewId');
    }

    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID "${reviewId}" not found`);
    }

    if (role !== Role.ADMIN && review.userId !== userId) {
      throw new ForbiddenException('You do not have permission to update this review');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedReview = await tx.review.update({
        where: { id: reviewId },
        data: {
          rating: updateReviewDto.rating !== undefined ? updateReviewDto.rating : review.rating,
          comment: updateReviewDto.comment !== undefined ? updateReviewDto.comment : review.comment,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: true,
            },
          },
        },
      });

      await this.recalculateProductRating(review.productId, tx);

      return this.formatReviewResponse(updatedReview);
    });
  }

  /**
   * Deletes a review (Author or Admin).
   */
  async deleteReview(userId: string, reviewId: string, role: Role) {
    if (!this.isUUID(reviewId)) {
      throw new BadRequestException('Invalid UUID format for reviewId');
    }

    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID "${reviewId}" not found`);
    }

    if (role !== Role.ADMIN && review.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this review');
    }

    const productId = review.productId;

    return this.prisma.$transaction(async (tx) => {
      await tx.review.delete({
        where: { id: reviewId },
      });

      await this.recalculateProductRating(productId, tx);

      return { message: 'Review deleted successfully' };
    });
  }
}
