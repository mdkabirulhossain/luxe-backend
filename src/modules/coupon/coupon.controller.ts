/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CouponService } from './coupon.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { CouponQueryDto } from './dto/coupon-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '@prisma/client';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@ApiTags('Coupons')
@Controller('coupon')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Get('public')
  @ResponseMessage('Public active coupons retrieved successfully')
  @ApiOperation({ summary: 'Get active promotional coupons for homepage banners & checkout modals (Public)' })
  @ApiResponse({ status: 200, description: 'Public coupons retrieved successfully.' })
  async getPublicCoupons() {
    return this.couponService.getPublicCoupons();
  }

  @Post('validate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Coupon validated successfully')
  @ApiOperation({ summary: 'Validate coupon code against user and order subtotal amount' })
  @ApiResponse({ status: 200, description: 'Coupon validated and discount calculated.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Invalid, expired, or minimum purchase requirement not met.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async validateCoupon(
    @Request() req: AuthenticatedRequest,
    @Body() validateCouponDto: ValidateCouponDto,
  ) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('User session not found');
    }
    return this.couponService.validateCoupon(userId, validateCouponDto.code, validateCouponDto.orderAmount);
  }

  @Get('my-coupons')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ResponseMessage('User vouchers retrieved successfully')
  @ApiOperation({ summary: "Get coupons available for the current user's wallet" })
  @ApiResponse({ status: 200, description: 'User vouchers retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getMyCoupons(@Request() req: AuthenticatedRequest) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('User session not found');
    }
    return this.couponService.getMyCoupons(userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ResponseMessage('Coupon created successfully')
  @ApiOperation({ summary: 'Create a new promotional coupon (Admin only)' })
  @ApiResponse({ status: 201, description: 'Coupon created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Invalid inputs.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Admin access required.' })
  @ApiResponse({ status: 409, description: 'Conflict: Coupon code already exists.' })
  async createCoupon(@Body() createCouponDto: CreateCouponDto) {
    return this.couponService.createCoupon(createCouponDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ResponseMessage('Coupons retrieved successfully')
  @ApiOperation({ summary: 'Get paginated list of all coupons (Admin only)' })
  @ApiResponse({ status: 200, description: 'Coupons list retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getCoupons(@Query() query: CouponQueryDto) {
    return this.couponService.getCoupons(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ResponseMessage('Coupon details retrieved successfully')
  @ApiOperation({ summary: 'Get single coupon details by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Coupon details retrieved.' })
  @ApiResponse({ status: 404, description: 'Not Found: Coupon not found.' })
  async getCouponById(@Param('id', ParseUUIDPipe) id: string) {
    return this.couponService.getCouponById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ResponseMessage('Coupon updated successfully')
  @ApiOperation({ summary: 'Update an existing coupon (Admin only)' })
  @ApiResponse({ status: 200, description: 'Coupon updated successfully.' })
  @ApiResponse({ status: 404, description: 'Not Found: Coupon not found.' })
  async updateCoupon(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCouponDto: UpdateCouponDto,
  ) {
    return this.couponService.updateCoupon(id, updateCouponDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Coupon deleted successfully')
  @ApiOperation({ summary: 'Delete a coupon (Admin only)' })
  @ApiResponse({ status: 200, description: 'Coupon deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Not Found: Coupon not found.' })
  async deleteCoupon(@Param('id', ParseUUIDPipe) id: string) {
    return this.couponService.deleteCoupon(id);
  }
}
