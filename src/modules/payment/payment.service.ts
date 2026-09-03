/* eslint-disable prettier/prettier */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaClientService } from '../../prisma-client/prisma-client.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { OrderStatus, PaymentStatus, Role } from '@prisma/client';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private stripe: Stripe;

  constructor(
    private readonly prisma: PrismaClientService,
    private readonly configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      this.logger.warn('STRIPE_SECRET_KEY is not defined in environment variables.');
    }
    this.stripe = new Stripe(stripeSecretKey || '', {
      apiVersion: '2025-02-24.acacia' as any,
    });
  }

  /**
   * Get Stripe publishable key for frontend initialization
   */
  getConfig() {
    const publishableKey = this.configService.get<string>('STRIPE_PUBLISHED_KEY');
    if (!publishableKey) {
      throw new InternalServerErrorException('Stripe publishable key is not configured on the server');
    }
    return { publishableKey };
  }

  /**
   * Creates a Stripe Payment Intent for a given order
   */
  async createPaymentIntent(userId: string, dto: CreatePaymentIntentDto) {
    const { orderId, currency = 'usd' } = dto;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found`);
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('You do not have permission to pay for this order');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot create payment for a cancelled order');
    }

    if (order.payment && order.payment.status === PaymentStatus.COMPLETED) {
      throw new BadRequestException('Payment for this order has already been completed');
    }

    // Amount in cents for USD (Stripe expects integer cents)
    const amountInCents = Math.round(order.totalAmount * 100);

    if (amountInCents <= 0) {
      throw new BadRequestException('Order total amount must be greater than zero to process payment');
    }

    try {
      // If payment record exists and has intent, try retrieving or re-using it
      if (order.payment && order.payment.stripePaymentIntentId) {
        try {
          const existingIntent = await this.stripe.paymentIntents.retrieve(order.payment.stripePaymentIntentId);
          if (existingIntent.status !== 'canceled' && existingIntent.status !== 'succeeded') {
            return {
              clientSecret: existingIntent.client_secret,
              paymentIntentId: existingIntent.id,
              amount: order.totalAmount,
              currency,
              publishableKey: this.configService.get<string>('STRIPE_PUBLISHED_KEY'),
              orderId: order.id,
            };
          }
        } catch (err) {
          this.logger.warn(`Could not retrieve existing intent ${order.payment.stripePaymentIntentId}, creating new one.`);
        }
      }

      // Create new Stripe PaymentIntent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: currency.toLowerCase(),
        metadata: {
          orderId: order.id,
          userId,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Upsert payment record in database
      await this.prisma.payment.upsert({
        where: { orderId: order.id },
        update: {
          stripePaymentIntentId: paymentIntent.id,
          stripeClientSecret: paymentIntent.client_secret,
          amount: order.totalAmount,
          currency: currency.toLowerCase(),
          status: PaymentStatus.PENDING,
          paymentMethod: 'stripe',
        },
        create: {
          orderId: order.id,
          userId,
          stripePaymentIntentId: paymentIntent.id,
          stripeClientSecret: paymentIntent.client_secret,
          amount: order.totalAmount,
          currency: currency.toLowerCase(),
          status: PaymentStatus.PENDING,
          paymentMethod: 'stripe',
        },
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: order.totalAmount,
        currency,
        publishableKey: this.configService.get<string>('STRIPE_PUBLISHED_KEY'),
        orderId: order.id,
      };
    } catch (error: any) {
      this.logger.error(`Stripe payment intent creation failed: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || 'Failed to create Stripe payment intent');
    }
  }

  /**
   * Confirms payment status with Stripe and updates order & payment status in DB
   */
  async confirmPayment(userId: string, role: Role, dto: ConfirmPaymentDto) {
    const { paymentIntentId, orderId } = dto;

    if (!paymentIntentId && !orderId) {
      throw new BadRequestException('Either paymentIntentId or orderId must be provided');
    }

    let payment = await this.prisma.payment.findFirst({
      where: {
        OR: [
          paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {},
          orderId ? { orderId } : {},
        ],
      },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    if (role !== Role.ADMIN && payment.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view or confirm this payment');
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      return {
        message: 'Payment already completed',
        payment,
      };
    }

    const intentIdToVerify = paymentIntentId || payment.stripePaymentIntentId;

    if (!intentIdToVerify) {
      throw new BadRequestException('No Stripe payment intent found for this order');
    }

    try {
      const intent = await this.stripe.paymentIntents.retrieve(intentIdToVerify);

      if (intent.status === 'succeeded') {
        const latestCharge = intent.latest_charge as any;
        const receiptUrl = typeof latestCharge === 'object' ? latestCharge?.receipt_url : null;

        return await this.prisma.$transaction(async (tx) => {
          const updatedPayment = await tx.payment.update({
            where: { id: payment!.id },
            data: {
              status: PaymentStatus.COMPLETED,
              receiptUrl,
            },
          });

          await tx.order.update({
            where: { id: payment!.orderId },
            data: {
              status: OrderStatus.PROCESSING,
            },
          });

          return {
            message: 'Payment confirmed successfully',
            status: PaymentStatus.COMPLETED,
            payment: updatedPayment,
          };
        });
      } else {
        return {
          message: `Payment intent status is currently: ${intent.status}`,
          status: payment.status,
          payment,
        };
      }
    } catch (error: any) {
      this.logger.error(`Error confirming Stripe payment: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || 'Failed to verify Stripe payment');
    }
  }

  /**
   * Retrieves payment details for a specific order
   */
  async getPaymentByOrderId(userId: string, role: Role, orderId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: {
        order: {
          select: {
            id: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`No payment found for order ID "${orderId}"`);
    }

    if (role !== Role.ADMIN && payment.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view payment details for this order');
    }

    return payment;
  }

  /**
   * Stripe Webhook Handler for automated asynchronous payment completion
   */
  async handleWebhook(signature: string | undefined, payload: Buffer | any) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    let event: Stripe.Event;

    try {
      if (webhookSecret && signature) {
        event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      } else {
        event = payload as Stripe.Event;
      }
    } catch (err: any) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    this.logger.log(`Received Stripe Webhook Event: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata?.orderId;

        if (orderId) {
          await this.prisma.$transaction(async (tx) => {
            const existingPayment = await tx.payment.findUnique({ where: { orderId } });
            if (existingPayment && existingPayment.status !== PaymentStatus.COMPLETED) {
              await tx.payment.update({
                where: { orderId },
                data: { status: PaymentStatus.COMPLETED },
              });
              await tx.order.update({
                where: { id: orderId },
                data: { status: OrderStatus.PROCESSING },
              });
            }
          });
          this.logger.log(`Payment & Order status updated to COMPLETED / PROCESSING for Order ${orderId}`);
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata?.orderId;

        if (orderId) {
          await this.prisma.payment.updateMany({
            where: { orderId },
            data: { status: PaymentStatus.FAILED },
          });
          this.logger.log(`Payment status set to FAILED for Order ${orderId}`);
        }
        break;
      }
    }

    return { received: true };
  }

  /**
   * Issues a full Stripe refund for an order (Admin Only)
   */
  async refundPayment(adminUserId: string, dto: RefundPaymentDto) {
    const { orderId, reason } = dto;

    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: {
        order: {
          include: { items: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`No payment record found for order ID "${orderId}"`);
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException(`Payment status is "${payment.status}". Only COMPLETED payments can be refunded.`);
    }

    if (!payment.stripePaymentIntentId) {
      throw new BadRequestException('Stripe Payment Intent ID is missing for this payment.');
    }

    try {
      // Execute Stripe refund
      const refund = await this.stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        reason: (reason as any) || 'requested_by_customer',
      });

      // Update DB in transaction (Refund Payment, Cancel Order, Restore Product Stock)
      return await this.prisma.$transaction(async (tx) => {
        const updatedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.REFUNDED },
        });

        // Restore inventory if order wasn't already cancelled
        if (payment.order.status !== OrderStatus.CANCELLED) {
          for (const item of payment.order.items) {
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

          await tx.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.CANCELLED },
          });
        }

        return {
          message: 'Payment refunded successfully and order cancelled with inventory restored',
          refundId: refund.id,
          payment: updatedPayment,
        };
      });
    } catch (error: any) {
      this.logger.error(`Stripe refund failed: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || 'Failed to process Stripe refund');
    }
  }
}
