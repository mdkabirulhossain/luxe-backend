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
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { OrderStatus, Role, Prisma } from '@prisma/client';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaClientService,
    private readonly couponService: CouponService,
  ) {}

  /**
   * Format Order object to match high-level frontend interfaces with product & category details
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

    const discountAmount = order.discountAmount || 0;
    const subtotalAmount = Number((order.totalAmount + discountAmount).toFixed(2));

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
      subtotalAmount,
      discountAmount,
      totalAmount: order.totalAmount,
      couponCode: order.couponCode || null,
      totalItems: formattedItems.reduce((acc: number, item: any) => acc + item.quantity, 0),
      status: order.status,
      shippingAddress: order.shippingAddress,
      items: formattedItems,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  /**
   * Places a new order inside a database transaction.
   * Validates products, decrements stock levels, updates inStock status, and records selected color/size variants.
   */
  async createOrder(userId: string, createOrderDto: CreateOrderDto) {
    if (!createOrderDto.items || createOrderDto.items.length === 0) {
      throw new BadRequestException('An order must contain at least one item');
    }

    return this.prisma.$transaction(async (tx) => {
      let subtotalAmount = 0;
      const resolvedItems: {
        productId: string;
        quantity: number;
        price: number;
        selectedColor?: string | null;
        selectedSize?: string | null;
      }[] = [];

      // 1. Validate stock and calculate total price
      for (const item of createOrderDto.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(`Product with ID "${item.productId}" not found`);
        }

        if (!product.isActive) {
          throw new BadRequestException(`Product "${product.name}" is currently inactive and cannot be ordered`);
        }

        if (!product.inStock || product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product "${product.name}". Available: ${product.stock}, requested: ${item.quantity}`,
          );
        }

        const selectedColor = item.selectedColor || item.color || null;
        const selectedSize = item.selectedSize || item.size || null;

        const finalPrice = product.price;
        subtotalAmount += finalPrice * item.quantity;

        resolvedItems.push({
          productId: item.productId,
          quantity: item.quantity,
          price: finalPrice,
          selectedColor,
          selectedSize,
        });

        // 2. Decrement product stock & auto-update inStock flag
        const newStock = product.stock - item.quantity;
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: newStock,
            inStock: newStock > 0,
          },
        });
      }

      // 2b. Validate & Apply Coupon Discount
      let appliedCouponCode: string | null = null;
      let discountAmount = 0;
      let couponId: string | null = null;

      if (createOrderDto.couponCode) {
        const couponResult = await this.couponService.validateCoupon(
          userId,
          createOrderDto.couponCode,
          subtotalAmount,
          tx,
        );
        appliedCouponCode = couponResult.code;
        discountAmount = couponResult.discountAmount;
        couponId = couponResult.couponId;
      }

      const finalTotalAmount = Number(Math.max(0, subtotalAmount - discountAmount).toFixed(2));

      // 3. Create Order and OrderItems
      const order = await tx.order.create({
        data: {
          userId,
          totalAmount: finalTotalAmount,
          couponCode: appliedCouponCode,
          discountAmount,
          status: OrderStatus.PENDING,
          shippingAddress: createOrderDto.shippingAddress as unknown as Prisma.InputJsonValue,
          items: {
            create: resolvedItems.map((item) => ({
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

      // 4. Record Coupon Usage
      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        });

        await tx.couponUsage.create({
          data: {
            couponId,
            userId,
            orderId: order.id,
          },
        });
      }

      // 4. Clear user's cart items if cart exists
      const userCart = await tx.cart.findUnique({ where: { userId } });
      if (userCart) {
        await tx.cartItem.deleteMany({ where: { cartId: userCart.id } });
      }

      return this.formatOrderResponse(order);
    });
  }

  /**
   * Retrieves orders with pagination and filtering.
   * ADMIN role retrieves all orders; CUSTOMER role retrieves only their own.
   */
  async getOrders(userId: string, role: Role, query: OrderQueryDto) {
    const { status, search, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const where: Prisma.OrderWhereInput = {};

    if (role !== Role.ADMIN) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const skip = (page - 1) * limit;
    const take = limit;

    const total = await this.prisma.order.count({ where });

    const orders = await this.prisma.order.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
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

    const formattedOrders = orders.map((o) => this.formatOrderResponse(o));

    return {
      data: formattedOrders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves a single order by ID with ownership verification.
   */
  async getOrderById(id: string, userId: string, role: Role) {
    const order = await this.prisma.order.findUnique({
      where: { id },
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

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    // Restrict standard customers to their own orders only
    if (role !== Role.ADMIN && order.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view this order');
    }

    return this.formatOrderResponse(order);
  }

  /**
   * Updates order status (Admin only).
   * Restores inventory if an active order is cancelled.
   * Re-deducts inventory if a cancelled order is restored (pending stock check).
   */
  async updateOrderStatus(id: string, status: OrderStatus) {
    const existingOrder = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingOrder) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    if (existingOrder.status === status) {
      return this.getOrderById(id, existingOrder.userId, Role.ADMIN);
    }

    return this.prisma.$transaction(async (tx) => {
      // Transitioning TO CANCELLED: restore product stock levels & update inStock
      if (status === OrderStatus.CANCELLED && existingOrder.status !== OrderStatus.CANCELLED) {
        for (const item of existingOrder.items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (product) {
            const newStock = product.stock + item.quantity;
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: newStock,
                inStock: newStock > 0,
              },
            });
          }
        }
      }
      // Transitioning AWAY FROM CANCELLED: re-verify and re-deduct product stock levels
      else if (existingOrder.status === OrderStatus.CANCELLED && status !== OrderStatus.CANCELLED) {
        for (const item of existingOrder.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (!product) {
            throw new NotFoundException(`Product with ID "${item.productId}" no longer exists`);
          }

          if (product.stock < item.quantity) {
            throw new BadRequestException(
              `Cannot restore order status to "${status}". Product "${product.name}" is out of stock (Requested: ${item.quantity}, Available: ${product.stock}).`,
            );
          }

          const newStock = product.stock - item.quantity;
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: newStock,
              inStock: newStock > 0,
            },
          });
        }
      }

      const updatedOrder = await tx.order.update({
        where: { id },
        data: { status },
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

      return this.formatOrderResponse(updatedOrder);
    });
  }

  /**
   * Allows a user or admin to cancel an order.
   * Customers can cancel their own PENDING orders.
   */
  async cancelOrder(id: string, userId: string, role: Role) {
    const existingOrder = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingOrder) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    if (role !== Role.ADMIN && existingOrder.userId !== userId) {
      throw new ForbiddenException('You do not have permission to cancel this order');
    }

    if (existingOrder.status === OrderStatus.CANCELLED) {
      return this.getOrderById(id, userId, role);
    }

    if (role !== Role.ADMIN && existingOrder.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Order cannot be cancelled because its current status is "${existingOrder.status}"`,
      );
    }

    return this.updateOrderStatus(id, OrderStatus.CANCELLED);
  }

  /**
   * Permanently deletes an order (Admin only). Restores stock if order wasn't cancelled.
   */
  async remove(id: string) {
    const existingOrder = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingOrder) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    if (existingOrder.status !== OrderStatus.CANCELLED) {
      for (const item of existingOrder.items) {
        const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
        if (product) {
          const newStock = product.stock + item.quantity;
          await this.prisma.product.update({
            where: { id: item.productId },
            data: {
              stock: newStock,
              inStock: newStock > 0,
            },
          });
        }
      }
    }

    await this.prisma.order.delete({
      where: { id },
    });

    return { message: 'Order deleted successfully' };
  }
}
