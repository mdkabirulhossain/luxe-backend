/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Products')
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new product (Admin only)' })
  @ApiResponse({ status: 201, description: 'Product successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Invalid parameters or discountPrice >= price.' })
  @ApiResponse({ status: 401, description: 'Unauthorized: Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient privileges.' })
  @ApiResponse({ status: 404, description: 'Not Found: Category not found.' })
  async create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated list of products with filters' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully.' })
  async findAll(@Query() query: ProductQueryDto) {
    return this.productService.findAll(query);
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get a single product by ID or unique slug' })
  @ApiResponse({ status: 200, description: 'Product retrieved.' })
  @ApiResponse({ status: 404, description: 'Not Found: Product not found.' })
  async findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.productService.findOne(idOrSlug);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update an existing product (Admin only)' })
  @ApiResponse({ status: 200, description: 'Product successfully updated.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Invalid parameters or discountPrice >= price.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient privileges.' })
  @ApiResponse({ status: 404, description: 'Not Found: Product or Category not found.' })
  async update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(id, updateProductDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a product (Admin only)' })
  @ApiResponse({ status: 200, description: 'Product successfully deleted.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Product is referenced in orders.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient privileges.' })
  @ApiResponse({ status: 404, description: 'Not Found: Product not found.' })
  async remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }
}
