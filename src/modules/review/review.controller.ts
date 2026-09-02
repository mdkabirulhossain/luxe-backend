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
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@ApiTags('Reviews')
@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ResponseMessage('Review submitted successfully')
  @ApiOperation({ summary: 'Submit a product review (Enforces Verified Purchase)' })
  @ApiResponse({ status: 201, description: 'Review successfully created and product rating recalculated.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Invalid parameters or rating out of range.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Product not purchased by user.' })
  @ApiResponse({ status: 404, description: 'Not Found: Product not found.' })
  @ApiResponse({ status: 409, description: 'Conflict: User already submitted a review for this product.' })
  async createReview(@Request() req: AuthenticatedRequest, @Body() createReviewDto: CreateReviewDto) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('User session not found');
    }
    return this.reviewService.createReview(userId, createReviewDto);
  }

  @Get()
  @ResponseMessage('Reviews retrieved successfully')
  @ApiOperation({ summary: 'Get paginated list of reviews (Public)' })
  @ApiResponse({ status: 200, description: 'List of reviews retrieved successfully.' })
  async getReviews(@Query() query: ReviewQueryDto) {
    return this.reviewService.getReviews(query);
  }

  @Get('product/:productId')
  @ResponseMessage('Product reviews retrieved successfully')
  @ApiOperation({ summary: 'Get paginated reviews for a specific product (Public)' })
  @ApiResponse({ status: 200, description: 'Product reviews retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Not Found: Product not found.' })
  async getReviewsForProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() query: ReviewQueryDto,
  ) {
    query.productId = productId;
    return this.reviewService.getReviews(query);
  }

  @Get('stats/:productId')
  @ResponseMessage('Product review statistics retrieved successfully')
  @ApiOperation({ summary: 'Get average rating and star breakdown stats for a product (Public)' })
  @ApiResponse({ status: 200, description: 'Product review stats retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Not Found: Product not found.' })
  async getProductReviewStats(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.reviewService.getProductReviewStats(productId);
  }

  @Get('check/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ResponseMessage('Review eligibility check completed')
  @ApiOperation({ summary: 'Check if user can review product (verified purchase check)' })
  @ApiResponse({ status: 200, description: 'Eligibility status returned successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async checkCanReview(
    @Request() req: AuthenticatedRequest,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    const userId = req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('User session not found');
    }
    return this.reviewService.checkCanReview(userId, productId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ResponseMessage('Review updated successfully')
  @ApiOperation({ summary: 'Update an existing review (Author or Admin)' })
  @ApiResponse({ status: 200, description: 'Review successfully updated and product rating recalculated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'Not Found: Review not found.' })
  async updateReview(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    const userId = req.user?.sub;
    const role = req.user?.role;
    if (!userId || !role) {
      throw new UnauthorizedException('User session not found');
    }
    return this.reviewService.updateReview(userId, id, updateReviewDto, role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Review deleted successfully')
  @ApiOperation({ summary: 'Delete a review (Author or Admin)' })
  @ApiResponse({ status: 200, description: 'Review successfully deleted and product rating recalculated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'Not Found: Review not found.' })
  async deleteReview(@Request() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    const userId = req.user?.sub;
    const role = req.user?.role;
    if (!userId || !role) {
      throw new UnauthorizedException('User session not found');
    }
    return this.reviewService.deleteReview(userId, id, role);
  }
}
