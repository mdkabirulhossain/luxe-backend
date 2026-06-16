/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaClientService } from '../../prisma-client/prisma-client.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(private readonly prisma: PrismaClientService) {}

  /**
   * Helper to generate a clean, unique slug from a product name.
   */
  private async generateUniqueSlug(name: string, idToExclude?: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')     // Replace non-alphanumeric characters with hyphens
      .replace(/(^-|-$)+/g, '');       // Trim leading/trailing hyphens

    let slug = baseSlug;
    let suffix = 1;
    let exists = true;

    while (exists) {
      const product = await this.prisma.product.findFirst({
        where: {
          slug,
          NOT: idToExclude ? { id: idToExclude } : undefined,
        },
      });

      if (!product) {
        exists = false;
      } else {
        slug = `${baseSlug}-${suffix}`;
        suffix++;
      }
    }

    return slug;
  }

  /**
   * Helper to verify if id matches UUID pattern.
   */
  private isUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  /**
   * Create a new product
   */
  async create(createProductDto: CreateProductDto) {
    const { name, description, price, discountPrice, images, stock, isActive, categoryId } = createProductDto;

    // Check category validity
    const categoryExists = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!categoryExists) {
      throw new NotFoundException(`Category with ID "${categoryId}" not found`);
    }

    // Validate discount price constraint
    if (discountPrice !== undefined && discountPrice !== null && discountPrice >= price) {
      throw new BadRequestException('Discount price must be less than regular price');
    }

    const slug = await this.generateUniqueSlug(name);

    return this.prisma.product.create({
      data: {
        name,
        slug,
        description,
        price,
        discountPrice,
        images: images || [],
        stock: stock !== undefined ? stock : 0,
        isActive: isActive !== undefined ? isActive : true,
        categoryId,
      },
      include: {
        category: true,
      },
    });
  }

  /**
   * Find all products with pagination, search, sorting, and price range filters
   */
  async findAll(query: ProductQueryDto) {
    const { search, categoryId, minPrice, maxPrice, isActive, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const where: any = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Handle min/max price range query parameters
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
    }

    const skip = (page - 1) * limit;
    const take = limit;

    const total = await this.prisma.product.count({ where });

    const data = await this.prisma.product.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        category: true,
      },
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find a single product by ID or unique slug
   */
  async findOne(idOrSlug: string) {
    let product;

    if (this.isUUID(idOrSlug)) {
      product = await this.prisma.product.findUnique({
        where: { id: idOrSlug },
        include: {
          category: true,
        },
      });
    } else {
      product = await this.prisma.product.findUnique({
        where: { slug: idOrSlug },
        include: {
          category: true,
        },
      });
    }

    if (!product) {
      throw new NotFoundException(`Product with ID or slug "${idOrSlug}" not found`);
    }

    return product;
  }

  /**
   * Update an existing product
   */
  async update(id: string, updateProductDto: UpdateProductDto) {
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!existingProduct) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    const { name, description, price, discountPrice, images, stock, isActive, categoryId } = updateProductDto;

    // Verify category exists if updated
    if (categoryId) {
      const categoryExists = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!categoryExists) {
        throw new NotFoundException(`Category with ID "${categoryId}" not found`);
      }
    }

    // Verify discount price constraint
    const finalPrice = price !== undefined ? price : existingProduct.price;
    const finalDiscountPrice = discountPrice !== undefined ? discountPrice : existingProduct.discountPrice;

    if (finalDiscountPrice !== null && finalDiscountPrice !== undefined && finalDiscountPrice >= finalPrice) {
      throw new BadRequestException('Discount price must be less than regular price');
    }

    const updateData: any = {
      description,
      price,
      discountPrice,
      images,
      stock,
      isActive,
      categoryId,
    };

    if (name) {
      updateData.name = name;
      updateData.slug = await this.generateUniqueSlug(name, id);
    }

    return this.prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });
  }

  /**
   * Delete a product
   */
  async remove(id: string) {
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!existingProduct) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    // Protect referential integrity - check if product has been purchased
    const hasBeenOrdered = await this.prisma.orderItem.findFirst({
      where: { productId: id },
    });

    if (hasBeenOrdered) {
      throw new BadRequestException(
        'Cannot delete product because it has been ordered in existing orders. Please set isActive to false to deactivate it instead.'
      );
    }

    await this.prisma.product.delete({
      where: { id },
    });

    return { message: 'Product deleted successfully' };
  }
}
