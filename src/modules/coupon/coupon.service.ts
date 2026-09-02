/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { PrismaClientService } from '../../prisma-client/prisma-client.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { CouponQueryDto } from './dto/coupon-query.dto';
import { DiscountType, Prisma } from '@prisma/client';

@Injectable()
export class CouponService implements OnModuleInit {
  private readonly logger = new Logger(CouponService.name);

  constructor(private readonly prisma: PrismaClientService) {}

  async onModuleInit() {
    await this.seedDefaultWelcomeCoupon();
  }

  /**
   * Helper to check UUID format
   */
  private isUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  /**
   * Automatically seeds the default welcome coupon WELCOME10 on application startup if missing.
   */
  async seedDefaultWelcomeCoupon() {
    try {
      const existing = await this.prisma.coupon.findUnique({
        where: { code: 'WELCOME10' },
      });

      if (!existing) {
        await this.prisma.coupon.create({
          data: {
            code: 'WELCOME10',
            description: '10% Welcome Discount for new customers on their first order',
            discountType: DiscountType.PERCENTAGE,
            discountValue: 10,
            minOrderAmount: 0,
            userLimit: 1,
            isActive: true,
          },
        });
        this.logger.log('Default welcome coupon "WELCOME10" seeded successfully');
      }
    } catch (error) {
      this.logger.warn(`Could not seed default welcome coupon: ${(error as Error).message}`);
    }
  }

  /**
   * Create a new coupon (Admin)
   */
  async createCoupon(createCouponDto: CreateCouponDto) {
    const code = createCouponDto.code.toUpperCase().trim();

    const existing = await this.prisma.coupon.findUnique({
      where: { code },
    });

    if (existing) {
      throw new ConflictException(`Coupon with code "${code}" already exists`);
    }

    return this.prisma.coupon.create({
      data: {
        ...createCouponDto,
        code,
      },
    });
  }

  /**
   * List paginated coupons (Admin)
   */
  async getCoupons(query: CouponQueryDto) {
    const { search, isActive, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const where: Prisma.CouponWhereInput = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;
    const total = await this.prisma.coupon.count({ where });

    const coupons = await this.prisma.coupon.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    });

    return {
      data: coupons,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single coupon by ID
   */
  async getCouponById(id: string) {
    if (!this.isUUID(id)) {
      throw new BadRequestException('Invalid UUID format for coupon id');
    }

    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      throw new NotFoundException(`Coupon with ID "${id}" not found`);
    }

    return coupon;
  }

  /**
   * Get single coupon by code
   */
  async getCouponByCode(code: string) {
    const normalizedCode = code.toUpperCase().trim();
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: normalizedCode },
    });

    if (!coupon) {
      throw new NotFoundException(`Coupon code "${normalizedCode}" not found`);
    }

    return coupon;
  }

  /**
   * Retrieves public active coupons for Homepage banners and Cart popups.
   */
  async getPublicCoupons() {
    const now = new Date();

    const coupons = await this.prisma.coupon.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      select: {
        id: true,
        code: true,
        description: true,
        discountType: true,
        discountValue: true,
        minOrderAmount: true,
        maxDiscountAmount: true,
        endDate: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return coupons;
  }

  /**
   * Retrieves active coupons available for the logged-in user (filtering out maxed out redemptions).
   */
  async getMyCoupons(userId: string) {
    const now = new Date();

    const activeCoupons = await this.prisma.coupon.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      include: {
        usages: {
          where: { userId },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return activeCoupons
      .filter((c) => {
        const userUsageCount = c.usages.length;
        const globalRemaining = c.usageLimit === null || c.usedCount < c.usageLimit;
        return userUsageCount < c.userLimit && globalRemaining;
      })
      .map((c) => ({
        id: c.id,
        code: c.code,
        description: c.description,
        discountType: c.discountType,
        discountValue: c.discountValue,
        minOrderAmount: c.minOrderAmount,
        maxDiscountAmount: c.maxDiscountAmount,
        endDate: c.endDate,
        userLimit: c.userLimit,
        userUsedCount: c.usages.length,
      }));
  }

  /**
   * Updates an existing coupon (Admin)
   */
  async updateCoupon(id: string, updateCouponDto: UpdateCouponDto) {
    await this.getCouponById(id);

    const updateData: any = { ...updateCouponDto };
    if (updateCouponDto.code) {
      updateData.code = updateCouponDto.code.toUpperCase().trim();
      const existing = await this.prisma.coupon.findUnique({
        where: { code: updateData.code },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Coupon with code "${updateData.code}" already exists`);
      }
    }

    return this.prisma.coupon.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Deletes a coupon (Admin)
   */
  async deleteCoupon(id: string) {
    await this.getCouponById(id);
    await this.prisma.coupon.delete({
      where: { id },
    });
    return { message: 'Coupon deleted successfully' };
  }

  /**
   * Validates a coupon code for a specific user and order subtotal amount.
   * Calculates exact discount and return updated totals.
   */
  async validateCoupon(userId: string, code: string, orderAmount: number, prismaTx?: any) {
    const client = prismaTx || this.prisma;
    const normalizedCode = code.toUpperCase().trim();

    const coupon = await client.coupon.findUnique({
      where: { code: normalizedCode },
    });

    if (!coupon) {
      throw new BadRequestException(`Invalid coupon code "${normalizedCode}"`);
    }

    if (!coupon.isActive) {
      throw new BadRequestException(`Coupon "${normalizedCode}" is currently inactive or disabled`);
    }

    const now = new Date();
    if (coupon.startDate && coupon.startDate > now) {
      throw new BadRequestException(`Coupon "${normalizedCode}" is not active yet`);
    }

    if (coupon.endDate && coupon.endDate < now) {
      throw new BadRequestException(`Coupon "${normalizedCode}" has expired`);
    }

    if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
      throw new BadRequestException(
        `Minimum order amount of $${coupon.minOrderAmount} required to apply coupon "${normalizedCode}". Current order subtotal: $${orderAmount}`,
      );
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException(`Coupon "${normalizedCode}" total redemption limit has been reached`);
    }

    const userUsageCount = await client.couponUsage.count({
      where: {
        couponId: coupon.id,
        userId,
      },
    });

    if (userUsageCount >= coupon.userLimit) {
      throw new BadRequestException(
        `You have already used coupon "${normalizedCode}" the maximum allowed number of times (${coupon.userLimit})`,
      );
    }

    let discountAmount = 0;
    if (coupon.discountType === DiscountType.PERCENTAGE) {
      const rawDiscount = (orderAmount * coupon.discountValue) / 100;
      discountAmount = coupon.maxDiscountAmount ? Math.min(rawDiscount, coupon.maxDiscountAmount) : rawDiscount;
    } else if (coupon.discountType === DiscountType.FIXED_AMOUNT) {
      discountAmount = Math.min(coupon.discountValue, orderAmount);
    }

    discountAmount = Number(discountAmount.toFixed(2));
    const finalAmount = Number(Math.max(0, orderAmount - discountAmount).toFixed(2));

    return {
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      finalAmount,
      message: `Coupon "${coupon.code}" applied successfully! Discount: $${discountAmount}`,
    };
  }
}
