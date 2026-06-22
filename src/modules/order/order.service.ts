/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaClientService } from '../../prisma-client/prisma-client.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, Role, Prisma } from '@prisma/client';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaClientService) {}

  /**
   * Places a new order inside a database transaction.
   * Decrements product inventory levels and throws an exception on stock shortages.
   */
  async createOrder(userId: string, createOrderDto: CreateOrderDto) {
    if (!createOrderDto.items || createOrderDto.items.length === 0) {
      throw new BadRequestException('An order must contain at least one item');
    }

    return this.prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const resolvedItems: { productId: string; quantity: number; price: number }[] = [];

      // 1. Validate stock and calculate prices
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

        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product "${product.name}". Available: ${product.stock}, requested: ${item.quantity}`
          );
        }

        // Use discountPrice if active, otherwise fallback to regular price
        const finalPrice = product.discountPrice !== null && product.discountPrice !== undefined
          ? product.discountPrice
          : product.price;

        totalAmount += finalPrice * item.quantity;

        resolvedItems.push({
          productId: item.productId,
          quantity: item.quantity,
          price: finalPrice,
        });

        // 2. Decrement product stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      // 3. Create Order and OrderItems
      return tx.order.create({
        data: {
          userId,
          totalAmount,
          status: OrderStatus.PENDING,
          shippingAddress: createOrderDto.shippingAddress as unknown as Prisma.InputJsonValue,
          items: {
            create: resolvedItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });
  }

  /**
   * Retrieves orders based on roles.
   * ADMIN role retrieves all orders; CUSTOMER role retrieves only their own.
   */
  async getOrders(userId: string, role: Role) {
    const where = role === Role.ADMIN ? {} : { userId };

    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
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
            product: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
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

    return order;
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
      // Transitioning TO CANCELLED: restore product stock levels
      if (status === OrderStatus.CANCELLED && existingOrder.status !== OrderStatus.CANCELLED) {
        for (const item of existingOrder.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
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
              `Cannot restore order status to "${status}". Product "${product.name}" is out of stock (Requested: ${item.quantity}, Available: ${product.stock}).`
            );
          }

          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }
      }

      return tx.order.update({
        where: { id },
        data: { status },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });
  }
}
