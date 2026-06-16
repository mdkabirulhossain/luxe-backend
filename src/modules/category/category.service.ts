/* eslint-disable prettier/prettier */
import { Injectable, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaClientService } from '../../prisma-client/prisma-client.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(private readonly prisma: PrismaClientService) {}

  /**
   * Helper to generate a clean, unique slug from a category name.
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
      const category = await this.prisma.category.findFirst({
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
   * Create a new category
   */
  async create(createCategoryDto: CreateCategoryDto) {
    const { name, description, image, isActive, parentId } = createCategoryDto;

    // Check parent category validity
    if (parentId) {
      const parentExists = await this.prisma.category.findUnique({
        where: { id: parentId },
      });
      if (!parentExists) {
        throw new NotFoundException(`Parent category with ID "${parentId}" not found`);
      }
    }

    const slug = await this.generateUniqueSlug(name);

    return this.prisma.category.create({
      data: {
        name,
        slug,
        description,
        image,
        isActive: isActive !== undefined ? isActive : true,
        parentId,
      },
      include: {
        parent: true,
      },
    });
  }

  /**
   * Find all categories
   * Supports searching by name/description, filtering by active status, rootsOnly, or returning as a structured tree.
   */
  async findAll(query: { search?: string; isActive?: string; rootsOnly?: string; tree?: string }) {
    const { search, isActive, rootsOnly, tree } = query;

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

    // If tree view is requested, build nesting in-memory for efficiency
    if (tree === 'true') {
      const allCategories = await this.prisma.category.findMany({
        where,
        orderBy: { name: 'asc' },
      });

      const categoryMap = new Map<string, any>();
      allCategories.forEach((cat) => {
        categoryMap.set(cat.id, { ...cat, subCategories: [] });
      });

      const roots: any[] = [];
      allCategories.forEach((cat) => {
        const mapped = categoryMap.get(cat.id);
        if (cat.parentId && categoryMap.has(cat.parentId)) {
          categoryMap.get(cat.parentId).subCategories.push(mapped);
        } else {
          // If the parent is not in the map (e.g. filtered out or doesn't exist), treat it as root
          roots.push(mapped);
        }
      });

      return roots;
    }

    return this.prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        parent: true,
      },
    });
  }

  /**
   * Find one category by ID or slug
   */
  async findOne(idOrSlug: string) {
    let category;

    if (this.isUUID(idOrSlug)) {
      category = await this.prisma.category.findUnique({
        where: { id: idOrSlug },
        include: {
          parent: true,
          subCategories: true,
        },
      });
    } else {
      category = await this.prisma.category.findUnique({
        where: { slug: idOrSlug },
        include: {
          parent: true,
          subCategories: true,
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
