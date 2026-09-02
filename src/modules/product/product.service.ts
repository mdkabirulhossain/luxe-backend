/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
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
   * Format product object to match both ProductCardData and ProductDetails frontend interfaces
   */
  private formatProductResponse(product: any) {
    if (!product) return null;

    const primaryImage = product.images && product.images.length > 0 ? product.images[0] : '';
    const origPrice = product.originalPrice ?? product.price;

    return {
      id: product.id,
      title: product.name,
      name: product.name,
      slug: product.slug,
      sku: product.sku || '',
      description: product.description || '',
      price: product.price,
      currentPrice: product.price,
      originalPrice: product.originalPrice ?? null,
      discount: product.discount ?? 0,
      images: product.images || [],
      image: primaryImage,
      stock: product.stock,
      stockQuantity: product.stock,
      inStock: product.inStock,
      isActive: product.isActive,
      isBestSeller: product.isBestSeller,
      isHot: product.isHot,
      isNew: product.isNew,
      colors: product.colors || [],
      colorVariants: product.colorVariants || [],
      sizes: product.sizes || [],
      rating: product.rating,
      reviewsCount: product.reviewsCount,

      // Category details formatted for frontend compatibility
      categoryId: product.categoryId,
      category: product.category?.name || '',
      categoryDetails: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
            slug: product.category.slug,
          }
        : null,

      // Subcategory details
      subCategoryId: product.subCategoryId || null,
      subCategory: product.subCategory
        ? {
            id: product.subCategory.id,
            name: product.subCategory.name,
            slug: product.subCategory.slug,
          }
        : null,

      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  /**
   * Create a new product (Admin)
   */
  async create(createProductDto: CreateProductDto) {
    const name = createProductDto.title || createProductDto.name;
    const {
      sku,
      description,
      price,
      images,
      colors,
      colorVariants,
      sizes,
      isActive,
      isBestSeller,
      isHot,
      isNew,
      categoryId,
      subCategoryId,
    } = createProductDto;

    const originalPrice = createProductDto.originalPrice ?? createProductDto.discountPrice;
    const stock = createProductDto.stockQuantity ?? createProductDto.stock ?? 0;
    const inStock = createProductDto.inStock !== undefined ? createProductDto.inStock : stock > 0;

    // Validate Main Category
    const categoryExists = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!categoryExists) {
      throw new NotFoundException(`Main Category with ID "${categoryId}" not found`);
    }

    // Validate Subcategory if provided
    if (subCategoryId) {
      const subCategoryExists = await this.prisma.category.findUnique({
        where: { id: subCategoryId },
      });
      if (!subCategoryExists) {
        throw new NotFoundException(`Subcategory with ID "${subCategoryId}" not found`);
      }
      if (subCategoryExists.parentId !== categoryId) {
        throw new BadRequestException(
          `Subcategory "${subCategoryExists.name}" does not belong to main category "${categoryExists.name}"`,
        );
      }
    }

    // Validate SKU uniqueness if provided
    if (sku) {
      const existingSku = await this.prisma.product.findFirst({
        where: { sku },
      });
      if (existingSku) {
        throw new ConflictException(`Product with SKU "${sku}" already exists`);
      }
    }

    // Validate prices
    if (originalPrice !== undefined && originalPrice !== null && originalPrice < price) {
      throw new BadRequestException('Original price cannot be less than current active price');
    }

    // Calculate discount percentage if not explicitly passed
    let discount = createProductDto.discount;
    if (discount === undefined && originalPrice && originalPrice > price) {
      discount = Math.round(((originalPrice - price) / originalPrice) * 100);
    }

    const slug = await this.generateUniqueSlug(name);

    const product = await this.prisma.product.create({
      data: {
        name,
        slug,
        sku: sku || null,
        description,
        price,
        originalPrice: originalPrice || null,
        discount: discount || 0,
        images: images || [],
        stock,
        inStock,
        isActive: isActive !== undefined ? isActive : true,
        isBestSeller: isBestSeller || false,
        isHot: isHot || false,
        isNew: isNew !== undefined ? isNew : true,
        colors: colors || [],
        colorVariants: colorVariants ? (colorVariants as any) : [],
        sizes: sizes || [],
        categoryId,
        subCategoryId: subCategoryId || null,
      },
      include: {
        category: true,
        subCategory: true,
      },
    });

    return this.formatProductResponse(product);
  }

  /**
   * Find all products with search, filtering, and pagination (Public & Admin)
   */
  async findAll(query: ProductQueryDto) {
    const {
      search,
      categoryId,
      subCategoryId,
      isBestSeller,
      isHot,
      isNew,
      inStock,
      minPrice,
      maxPrice,
      isActive,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: any = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (subCategoryId) {
      where.subCategoryId = subCategoryId;
    }

    if (isBestSeller !== undefined) {
      where.isBestSeller = isBestSeller === 'true';
    }

    if (isHot !== undefined) {
      where.isHot = isHot === 'true';
    }

    if (isNew !== undefined) {
      where.isNew = isNew === 'true';
    }

    if (inStock !== undefined) {
      where.inStock = inStock === 'true';
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

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

    const products = await this.prisma.product.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        category: true,
        subCategory: true,
      },
    });

    const formattedProducts = products.map((p) => this.formatProductResponse(p));

    return {
      data: formattedProducts,
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
          subCategory: true,
        },
      });
    } else {
      product = await this.prisma.product.findUnique({
        where: { slug: idOrSlug },
        include: {
          category: true,
          subCategory: true,
        },
      });
    }

    if (!product) {
      throw new NotFoundException(`Product with ID or slug "${idOrSlug}" not found`);
    }

    return this.formatProductResponse(product);
  }

  /**
   * Update an existing product (Admin)
   */
  async update(id: string, updateProductDto: UpdateProductDto) {
    const existingProduct = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!existingProduct) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    const name = updateProductDto.title || updateProductDto.name;
    const {
      sku,
      description,
      price,
      images,
      colors,
      colorVariants,
      sizes,
      isActive,
      isBestSeller,
      isHot,
      isNew,
      categoryId,
      subCategoryId,
      inStock,
    } = updateProductDto;

    const originalPrice = updateProductDto.originalPrice ?? updateProductDto.discountPrice;
    const stock = updateProductDto.stockQuantity ?? updateProductDto.stock;

    const targetCategoryId = categoryId || existingProduct.categoryId;
    const targetSubCategoryId = subCategoryId !== undefined ? subCategoryId : existingProduct.subCategoryId;

    // Validate Main Category if changing
    if (categoryId) {
      const categoryExists = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!categoryExists) {
        throw new NotFoundException(`Main Category with ID "${categoryId}" not found`);
      }
    }

    // Validate Subcategory if changing or present
    if (targetSubCategoryId) {
      const subCategoryExists = await this.prisma.category.findUnique({
        where: { id: targetSubCategoryId },
      });
      if (!subCategoryExists) {
        throw new NotFoundException(`Subcategory with ID "${targetSubCategoryId}" not found`);
      }
      if (subCategoryExists.parentId !== targetCategoryId) {
        throw new BadRequestException(
          `Subcategory "${subCategoryExists.name}" does not belong to main category`,
        );
      }
    }

    // Validate SKU uniqueness if changing
    if (sku && sku !== existingProduct.sku) {
      const existingSku = await this.prisma.product.findFirst({
        where: { sku },
      });
      if (existingSku) {
        throw new ConflictException(`Product with SKU "${sku}" already exists`);
      }
    }

    // Price & Discount calculations
    const finalPrice = price !== undefined ? price : existingProduct.price;
    const finalOriginalPrice = originalPrice !== undefined ? originalPrice : existingProduct.originalPrice;

    if (finalOriginalPrice !== null && finalOriginalPrice !== undefined && finalOriginalPrice < finalPrice) {
      throw new BadRequestException('Original price cannot be less than active price');
    }

    let finalDiscount = updateProductDto.discount;
    if (finalDiscount === undefined && finalOriginalPrice && finalOriginalPrice > finalPrice) {
      finalDiscount = Math.round(((finalOriginalPrice - finalPrice) / finalOriginalPrice) * 100);
    }

    const finalStock = stock !== undefined ? stock : existingProduct.stock;
    const finalInStock = inStock !== undefined ? inStock : finalStock > 0;

    const updateData: any = {
      sku: sku !== undefined ? sku : existingProduct.sku,
      description: description !== undefined ? description : existingProduct.description,
      price: finalPrice,
      originalPrice: finalOriginalPrice,
      discount: finalDiscount !== undefined ? finalDiscount : existingProduct.discount,
      images: images !== undefined ? images : existingProduct.images,
      stock: finalStock,
      inStock: finalInStock,
      isActive: isActive !== undefined ? isActive : existingProduct.isActive,
      isBestSeller: isBestSeller !== undefined ? isBestSeller : existingProduct.isBestSeller,
      isHot: isHot !== undefined ? isHot : existingProduct.isHot,
      isNew: isNew !== undefined ? isNew : existingProduct.isNew,
      colors: colors !== undefined ? colors : existingProduct.colors,
      colorVariants: colorVariants !== undefined ? (colorVariants as any) : existingProduct.colorVariants,
      sizes: sizes !== undefined ? sizes : existingProduct.sizes,
      categoryId: targetCategoryId,
      subCategoryId: targetSubCategoryId,
    };

    if (name && name !== existingProduct.name) {
      updateData.name = name;
      updateData.slug = await this.generateUniqueSlug(name, id);
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        subCategory: true,
      },
    });

    return this.formatProductResponse(updatedProduct);
  }

  /**
   * Delete a product (Admin)
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
        'Cannot delete product because it has been ordered in existing orders. Please set isActive to false to deactivate it instead.',
      );
    }

    await this.prisma.product.delete({
      where: { id },
    });

    return { message: 'Product deleted successfully' };
  }
}
