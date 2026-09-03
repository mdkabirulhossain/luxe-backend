/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '@prisma/client';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('config')
  @ResponseMessage('Stripe publishable key retrieved successfully')
  @ApiOperation({ summary: 'Get Stripe publishable key for frontend initialization' })
  @ApiResponse({ status: 200, description: 'Stripe publishable key retrieved.' })
  getConfig() {
    return this.paymentService.getConfig();
  }

  @Post('create-intent')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Payment intent created successfully')
  @ApiOperation({ summary: 'Create Stripe Payment Intent for an order' })
  @ApiResponse({ status: 201, description: 'Payment Intent created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Order already paid, cancelled, or invalid.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  async createPaymentIntent(
    @Request() req: AuthenticatedRequest,
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
  ) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('User session not found');
    }
    return this.paymentService.createPaymentIntent(userId, createPaymentIntentDto);
  }

  @Post('confirm')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Payment status verified successfully')
  @ApiOperation({ summary: 'Confirm & verify Stripe payment status for an order' })
  @ApiResponse({ status: 200, description: 'Payment status successfully verified.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Missing or invalid parameters.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Payment record not found.' })
  async confirmPayment(
    @Request() req: AuthenticatedRequest,
    @Body() confirmPaymentDto: ConfirmPaymentDto,
  ) {
    const userId = req.user?.sub;
    const role = req.user?.role;
    if (!userId || !role) {
      throw new UnauthorizedException('User session not found');
    }
    return this.paymentService.confirmPayment(userId, role, confirmPaymentDto);
  }

  @Get('order/:orderId')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Payment details retrieved successfully')
  @ApiOperation({ summary: 'Get payment status and details for an order' })
  @ApiResponse({ status: 200, description: 'Payment details retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Payment not found.' })
  async getPaymentByOrderId(
    @Request() req: AuthenticatedRequest,
    @Param('orderId') orderId: string,
  ) {
    const userId = req.user?.sub;
    const role = req.user?.role;
    if (!userId || !role) {
      throw new UnauthorizedException('User session not found');
    }
    return this.paymentService.getPaymentByOrderId(userId, role, orderId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe Webhook Listener for asynchronous payment events' })
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Body() payload: any,
  ) {
    return this.paymentService.handleWebhook(signature, payload);
  }

  @Post('refund')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Payment refunded successfully')
  @ApiOperation({ summary: 'Process Stripe refund and cancel order with stock restoration (Admin only)' })
  @ApiResponse({ status: 200, description: 'Refund processed successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Only COMPLETED payments can be refunded.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin access required.' })
  @ApiResponse({ status: 404, description: 'Payment record not found.' })
  async refundPayment(
    @Request() req: AuthenticatedRequest,
    @Body() refundPaymentDto: RefundPaymentDto,
  ) {
    const adminUserId = req.user?.sub;
    if (!adminUserId) {
      throw new UnauthorizedException('Admin session not found');
    }
    return this.paymentService.refundPayment(adminUserId, refundPaymentDto);
  }
}
