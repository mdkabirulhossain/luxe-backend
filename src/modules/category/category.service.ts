/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaClientService } from '../../prisma-client/prisma-client.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryQueryDto } from './dto/category-query.dto';

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(private readonly prisma: PrismaClientService) {}

  // Selection structure for subcategory objects (excludes image and nested subCategories)
  private readonly subCategoriesSelect = {
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

  // Selection structure for root categories (EXCLUDES parentId and parent)
  private readonly rootCategorySelect = {
    id: true,
    name: true,
    slug: true,
    description: true,
    image: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    subCategories: this.subCategoriesSelect,
  };

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
   * Create a new category with optional subcategories
   * Validates duplicate names for category & subcategories and throws ConflictException if already existing.
   */
  async create(createCategoryDto: CreateCategoryDto) {
    const { name, image, isActive, subcategories } = createCategoryDto;

    return this.prisma.$transaction(async (tx) => {
      // 1. Validate root category name
      if (!name || typeof name !== 'string' || name.trim() === '') {
        throw new BadRequestException('Category name is required and cannot be empty');
      }

      const trimmedName = name.trim();

      // Check if category with exact name (case-insensitive) already exists
      const existingCategory = await tx.category.findFirst({
        where: {
          name: { equals: trimmedName, mode: 'insensitive' },
        },
      });

      if (existingCategory) {
        throw new ConflictException(`Category with name "${trimmedName}" already exists`);
      }

      const slug = await this.generateUniqueSlug(trimmedName, undefined, tx);

      const rootCategory = await tx.category.create({
        data: {
          name: trimmedName,
          slug,
          image,
          isActive: isActive !== undefined ? isActive : true,
        },
      });

      // 2. Validate & Create subcategories under root category if provided
      if (subcategories && Array.isArray(subcategories) && subcategories.length > 0) {
        const subcategoryNamesInRequest = new Set<string>();

        for (const sub of subcategories) {
          const subName = typeof sub === 'string' ? sub.trim() : (sub?.name ? String(sub.name).trim() : '');
          if (!subName) {
            throw new BadRequestException('Subcategory name is required and cannot be empty');
          }

          const lowerSubName = subName.toLowerCase();
          if (subcategoryNamesInRequest.has(lowerSubName)) {
            throw new BadRequestException(`Duplicate subcategory name "${subName}" in request payload`);
          }
          subcategoryNamesInRequest.add(lowerSubName);

          // Check if subcategory with same name already exists in database
          const existingSub = await tx.category.findFirst({
            where: {
              name: { equals: subName, mode: 'insensitive' },
            },
          });

          if (existingSub) {
            throw new ConflictException(`Subcategory with name "${subName}" already exists`);
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

      // 3. Return created root category using rootCategorySelect (without parentId and parent on root)
      return tx.category.findUnique({
        where: { id: rootCategory.id },
        select: this.rootCategorySelect,
      });
    });
  }

  /**
   * Find all main categories (parentId = null) with their subcategories.
   * Supports pagination with meta response (counting only main categories), searching, and active filtering.
   */
  async findAll(query: CategoryQueryDto) {
    const {
      search,
      isActive,
      page = 1,
      limit = 10,
      sortBy = 'name',
      sortOrder = 'asc',
    } = query;

    const where: any = {
      parentId: null, // Always filter for main categories only
    };

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    // Count ONLY main categories
    const total = await this.prisma.category.count({ where });

    // Fetch main categories with nested subcategories
    const data = await this.prisma.category.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: this.rootCategorySelect,
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

    if (this.isUUID(idOrSlug)) {
      category = await this.prisma.category.findUnique({
        where: { id: idOrSlug },
        select: this.rootCategorySelect,
      });
    } else {
      category = await this.prisma.category.findUnique({
        where: { slug: idOrSlug },
        select: this.rootCategorySelect,
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
  /**
   * Update category by ID
   * Supports updating main category details (name, image, isActive) as well as adding or updating subcategories.
   */
  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const existingCategory = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }

    const { name, image, isActive, subcategories } = updateCategoryDto;

    return this.prisma.$transaction(async (tx) => {
      const updateData: any = {};

      if (image !== undefined) {
        updateData.image = image;
      }

      if (isActive !== undefined) {
        updateData.isActive = isActive;
      }

      if (name) {
        const trimmedName = name.trim();

        // Check if another category already has this name
        const existingWithName = await tx.category.findFirst({
          where: {
            name: { equals: trimmedName, mode: 'insensitive' },
            NOT: { id },
          },
        });

        if (existingWithName) {
          throw new ConflictException(`Category with name "${trimmedName}" already exists`);
        }

        updateData.name = trimmedName;
        updateData.slug = await this.generateUniqueSlug(trimmedName, id, tx);
      }

      if (Object.keys(updateData).length > 0) {
        await tx.category.update({
          where: { id },
          data: updateData,
        });
      }

      // Handle subcategories update/creation if provided
      if (subcategories && Array.isArray(subcategories) && subcategories.length > 0) {
        const subcategoryNamesInRequest = new Set<string>();

        for (const sub of subcategories) {
          const subId = typeof sub === 'object' && sub?.id ? String(sub.id).trim() : undefined;
          const subName = typeof sub === 'string' ? sub.trim() : (sub?.name ? String(sub.name).trim() : '');

          if (!subName) {
            throw new BadRequestException('Subcategory name is required and cannot be empty');
          }

          const lowerSubName = subName.toLowerCase();
          if (subcategoryNamesInRequest.has(lowerSubName)) {
            throw new BadRequestException(`Duplicate subcategory name "${subName}" in request payload`);
          }
          subcategoryNamesInRequest.add(lowerSubName);

          if (subId) {
            // Case 1: Subcategory ID is provided -> update existing subcategory
            const targetSub = await tx.category.findUnique({
              where: { id: subId },
            });

            if (!targetSub) {
              throw new NotFoundException(`Subcategory with ID "${subId}" not found`);
            }

            if (targetSub.parentId !== id) {
              throw new BadRequestException(`Subcategory with ID "${subId}" does not belong to category "${id}"`);
            }

            // Check if name is changing and collides with another category
            if (targetSub.name.toLowerCase() !== lowerSubName) {
              const nameCollision = await tx.category.findFirst({
                where: {
                  name: { equals: subName, mode: 'insensitive' },
                  NOT: { id: subId },
                },
              });

              if (nameCollision) {
                throw new ConflictException(`Category with name "${subName}" already exists`);
              }

              const newSubSlug = await this.generateUniqueSlug(subName, subId, tx);
              await tx.category.update({
                where: { id: subId },
                data: {
                  name: subName,
                  slug: newSubSlug,
                },
              });
            }
          } else {
            // Case 2: Subcategory ID is NOT provided -> check existing by name or create new
            const existingSub = await tx.category.findFirst({
              where: {
                name: { equals: subName, mode: 'insensitive' },
              },
            });

            if (existingSub) {
              if (existingSub.parentId !== id) {
                throw new ConflictException(`Subcategory with name "${subName}" already exists under another category`);
              }
            } else {
              const newSubSlug = await this.generateUniqueSlug(subName, undefined, tx);
              await tx.category.create({
                data: {
                  name: subName,
                  slug: newSubSlug,
                  parentId: id,
                  isActive: true,
                },
              });
            }
          }
        }
      }

      // If category being updated is a Root Category (parentId === null), return rootCategorySelect
      if (existingCategory.parentId === null) {
        return tx.category.findUnique({
          where: { id },
          select: this.rootCategorySelect,
        });
      } else {
        return tx.category.findUnique({
          where: { id },
          include: {
            parent: true,
          },
        });
      }
    });
  }

  /**
   * Remove a category (Main Category or Subcategory)
   * Production Level: Cascades deletion to child subcategories in a single atomic transaction.
   * Protects catalog integrity by preventing deletion if products are assigned to the category or any of its subcategories.
   */
  async remove(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        subCategories: {
          select: { id: true, name: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }

    // Collect IDs of this category and all its child subcategories
    const subCategoryIds = category.subCategories.map((sub) => sub.id);
    const categoryIdsToCheck = [id, ...subCategoryIds];

    // Check if any product is assigned to this category or any of its child subcategories
    const productAssigned = await this.prisma.product.findFirst({
      where: {
        categoryId: { in: categoryIdsToCheck },
      },
      include: {
        category: {
          select: { name: true },
        },
      },
    });

    if (productAssigned) {
      throw new BadRequestException(
        `Cannot delete category "${category.name}" because product "${productAssigned.name}" is assigned to "${productAssigned.category.name}". Please reassign or remove the products first.`
      );
    }

    // Atomic transaction deletion: delete all child subcategories, then delete main category
    return this.prisma.$transaction(async (tx) => {
      let deletedSubCount = 0;
      if (subCategoryIds.length > 0) {
        const deleteSubResult = await tx.category.deleteMany({
          where: { parentId: id },
        });
        deletedSubCount = deleteSubResult.count;
      }

      await tx.category.delete({
        where: { id },
      });

      if (deletedSubCount > 0) {
        return {
          message: `Category "${category.name}" and its ${deletedSubCount} subcategory(ies) deleted successfully`,
        };
      }

      return {
        message: `Category "${category.name}" deleted successfully`,
      };
    });
  }
}
