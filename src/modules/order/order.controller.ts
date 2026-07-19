/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

interface AuthenticatedRequest extends Express.Request {
  user?: {
    sub: string;
    email?: string;
    role?: Role;
  };
}

@ApiTags('Orders')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Place a new order' })
  @ApiResponse({ status: 201, description: 'Order successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Out of stock or invalid items.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async createOrder(@Request() req: AuthenticatedRequest, @Body() createOrderDto: CreateOrderDto) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('User session not found');
    }
    return this.orderService.createOrder(userId, createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get order history (Customers view their own, Admins view all)' })
  @ApiResponse({ status: 200, description: 'List of orders retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getOrders(@Request() req: AuthenticatedRequest) {
    const userId = req.user?.sub;
    const role = req.user?.role;
    if (!userId || !role) {
      throw new UnauthorizedException('User session not found');
    }
    return this.orderService.getOrders(userId, role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific order' })
  @ApiResponse({ status: 200, description: 'Order details retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient privileges.' })
  @ApiResponse({ status: 404, description: 'Not Found: Order not found.' })
  async getOrderById(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const userId = req.user?.sub;
    const role = req.user?.role;
    if (!userId || !role) {
      throw new UnauthorizedException('User session not found');
    }
    return this.orderService.getOrderById(id, userId, role);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an order status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Order status successfully updated.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Insufficient stock for restoration.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient privileges.' })
  @ApiResponse({ status: 404, description: 'Not Found: Order or product not found.' })
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateOrderStatus(id, updateOrderStatusDto.status);
  }
}
