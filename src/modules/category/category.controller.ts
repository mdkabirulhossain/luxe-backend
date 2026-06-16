/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Categories')
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new category (Admin only)' })
  @ApiResponse({ status: 201, description: 'Category successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Invalid DTO parameters or circular parent relationships.' })
  @ApiResponse({ status: 401, description: 'Unauthorized: Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient privileges.' })
  @ApiResponse({ status: 404, description: 'Not Found: Specified parent category does not exist.' })
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get list of all categories' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term for name or description' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status (true/false)' })
  @ApiQuery({ name: 'rootsOnly', required: false, description: 'Fetch only top-level categories (true)' })
  @ApiQuery({ name: 'tree', required: false, description: 'Format categories as a nested tree hierarchy (true)' })
  @ApiResponse({ status: 200, description: 'Categories list retrieved.' })
  async findAll(
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('rootsOnly') rootsOnly?: string,
    @Query('tree') tree?: string,
  ) {
    return this.categoryService.findAll({ search, isActive, rootsOnly, tree });
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get a single category by ID or unique slug' })
  @ApiResponse({ status: 200, description: 'Category details retrieved.' })
  @ApiResponse({ status: 404, description: 'Not Found: Category not found.' })
  async findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.categoryService.findOne(idOrSlug);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update an existing category (Admin only)' })
  @ApiResponse({ status: 200, description: 'Category updated.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Self-referential or circular parent dependency.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient privileges.' })
  @ApiResponse({ status: 404, description: 'Not Found: Category or specified parent category not found.' })
  async update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a category (Admin only)' })
  @ApiResponse({ status: 200, description: 'Category successfully deleted.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Category has subcategories or associated products.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient privileges.' })
  @ApiResponse({ status: 404, description: 'Not Found: Category not found.' })
  async remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }
}
