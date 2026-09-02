/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaClientService } from '../../prisma-client/prisma-client.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryQueryDto } from './dto/category-query.dto';

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(private readonly prisma: PrismaClientService) {}

  /**
   * Helper to generate a clean, unique slug from a category name.
   */
  private async generateUniqueSlug(
    name: string,
    idToExclude?: string,
    prismaClient: any = this.prisma,
  ): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')     // Replace non-alphanumeric characters with hyphens
      .replace(/(^-|-$)+/g, '');       // Trim leading/trailing hyphens

    let slug = baseSlug || 'category';
    let suffix = 1;
    let exists = true;

    while (exists) {
      const category = await prismaClient.category.findFirst({
        where: {
          slug,
          NOT: idToExclude ? { id: idToExclude } : undefined,
        },
      });

      if (!category) {
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
   * Create a new category with optional subcategories (admin passes array of subcategory objects with name)
   */
  async create(createCategoryDto: CreateCategoryDto) {
    const { name, image, isActive, subcategories } = createCategoryDto;

    return this.prisma.$transaction(async (tx) => {
      // 1. Validate and create root category
      if (!name || typeof name !== 'string' || name.trim() === '') {
        throw new BadRequestException('Category name is required and cannot be empty');
      }

      const trimmedName = name.trim();
      const slug = await this.generateUniqueSlug(trimmedName, undefined, tx);

      const rootCategory = await tx.category.create({
        data: {
          name: trimmedName,
          slug,
          image,
          isActive: isActive !== undefined ? isActive : true,
        },
      });

      // 2. Create subcategories under root category if provided
      if (subcategories && Array.isArray(subcategories) && subcategories.length > 0) {
        for (const sub of subcategories) {
          const subName = typeof sub === 'string' ? sub.trim() : (sub?.name ? String(sub.name).trim() : '');
          if (!subName) {
            throw new BadRequestException('Subcategory name is required and cannot be empty');
          }

          const subSlug = await this.generateUniqueSlug(subName, undefined, tx);

          await tx.category.create({
            data: {
              name: subName,
              slug: subSlug,
              parentId: rootCategory.id,
              isActive: true,
            },
          });
        }
      }

      // 3. Return created root category with subCategories (without image or nested subCategories inside each subcategory)
      return tx.category.findUnique({
        where: { id: rootCategory.id },
        include: {
          subCategories: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              isActive: true,
              parentId: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
    });
  }

  /**
   * Find all categories
   * Supports pagination with meta response, searching by name/description, filtering by active status, rootsOnly, or tree hierarchy.
   */
  async findAll(query: CategoryQueryDto) {
    const {
      search,
      isActive,
      rootsOnly,
      tree,
      page = 1,
      limit = 10,
      sortBy = 'name',
      sortOrder = 'asc',
    } = query;

    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (rootsOnly === 'true' && tree !== 'true') {
      where.parentId = null;
    }

    const subCategoriesInclude = {
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isActive: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
      },
    };

    const skip = (page - 1) * limit;

    // If tree view is requested, return top-level root categories with their subcategories
    if (tree === 'true') {
      where.parentId = null;

      const total = await this.prisma.category.count({ where });

      const roots = await this.prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          subCategories: subCategoriesInclude,
        },
      });

      const totalPages = Math.ceil(total / limit);

      return {
        data: roots,
        meta: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    }

    const total = await this.prisma.category.count({ where });

    const data = await this.prisma.category.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        parent: true,
        subCategories: subCategoriesInclude,
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Find one category by ID or slug
   */
  async findOne(idOrSlug: string) {
    let category;

    const subCategoriesInclude = {
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isActive: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
      },
    };

    if (this.isUUID(idOrSlug)) {
      category = await this.prisma.category.findUnique({
        where: { id: idOrSlug },
        include: {
          parent: true,
          subCategories: subCategoriesInclude,
        },
      });
    } else {
      category = await this.prisma.category.findUnique({
        where: { slug: idOrSlug },
        include: {
          parent: true,
          subCategories: subCategoriesInclude,
        },
      });
    }

    if (!category) {
      throw new NotFoundException(`Category with ID or slug "${idOrSlug}" not found`);
    }

    return category;
  }

  /**
   * Update category
   */
  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }

    const { name, description, image, isActive, parentId } = updateCategoryDto;

    // Check parent validation
    if (parentId) {
      if (parentId === id) {
        throw new BadRequestException('A category cannot be its own parent');
      }

      const parentExists = await this.prisma.category.findUnique({
        where: { id: parentId },
      });
      if (!parentExists) {
        throw new NotFoundException(`Parent category with ID "${parentId}" not found`);
      }

      // Check for circular dependency
      let currentParentId = parentId;
      while (currentParentId) {
        if (currentParentId === id) {
          throw new BadRequestException('Circular dependency detected: Parent category cannot be a descendant of this category');
        }
        const parent = await this.prisma.category.findUnique({
          where: { id: currentParentId },
          select: { parentId: true },
        });
        currentParentId = parent?.parentId || '';
      }
    }

    const updateData: any = {
      description,
      image,
      isActive,
      parentId,
    };

    if (name) {
      updateData.name = name;
      updateData.slug = await this.generateUniqueSlug(name, id);
    }

    return this.prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        parent: true,
      },
    });
  }

  /**
   * Remove a category
   */
  async remove(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }

    // Check if category has subcategories
    const hasSubCategories = await this.prisma.category.findFirst({
      where: { parentId: id },
    });
    if (hasSubCategories) {
      throw new BadRequestException(
        'Cannot delete category because it has subcategories. Please reassign or delete subcategories first.'
      );
    }

    // Check if category has associated products
    const hasProducts = await this.prisma.product.findFirst({
      where: { categoryId: id },
    });
    if (hasProducts) {
      throw new BadRequestException(
        'Cannot delete category because it has associated products. Please reassign or delete the products first.'
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });

    return { message: 'Category deleted successfully' };
  }
}
