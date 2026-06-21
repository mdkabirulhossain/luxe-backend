/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaClientService } from '../../prisma-client/prisma-client.service';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { Role } from '@prisma/client';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaClientService) {}

  /**
   * Retrieves a paginated, filtered, and sorted list of users.
   * Sensitive security tokens and passwords are excluded.
   */
  async getAllUsers(query: AdminUserQueryDto) {
    const { page = 1, limit = 10, search, role, isBanned, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isBanned !== undefined) {
      where.isBanned = isBanned;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Dynamic field sorting validation to prevent syntax errors
    const validSortFields = ['id', 'email', 'name', 'phone', 'role', 'isActive', 'isBanned', 'createdAt', 'updatedAt'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [orderByField]: sortOrder,
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
          isBanned: true,
          banReason: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
        } as any,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Bans a user with a given reason. Immediately revokes their active sessions.
   * Prevents self-banning and administrator-banning.
   */
  async banUser(adminId: string, targetUserId: string, reason: string) {
    if (adminId === targetUserId) {
      throw new BadRequestException('You cannot ban your own account');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException(`User with ID "${targetUserId}" not found`);
    }

    if (targetUser.role === Role.ADMIN) {
      throw new BadRequestException('Administrators cannot ban other administrators');
    }

    if ((targetUser as any).isBanned) {
      throw new BadRequestException('This user account is already banned');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        isBanned: true,
        banReason: reason,
        refreshToken: null, // immediately revoke session so they are kicked out
      } as any,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBanned: true,
        banReason: true,
      } as any,
    });

    this.logger.log(`Admin "${adminId}" banned user "${targetUserId}" (Email: ${targetUser.email}). Reason: ${reason}`);

    return {
      message: 'User has been successfully banned and all sessions have been revoked',
      user: updatedUser,
    };
  }

  /**
   * Unbans a user.
   */
  async unbanUser(adminId: string, targetUserId: string) {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException(`User with ID "${targetUserId}" not found`);
    }

    if (!(targetUser as any).isBanned) {
      throw new BadRequestException('This user account is not currently banned');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        isBanned: false,
        banReason: null,
      } as any,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBanned: true,
        banReason: true,
      } as any,
    });

    this.logger.log(`Admin "${adminId}" unbanned user "${targetUserId}" (Email: ${targetUser.email})`);

    return {
      message: 'User has been successfully unbanned',
      user: updatedUser,
    };
  }

  /**
   * Retrieves the detailed profile of a specific user.
   * Sensitive security tokens and passwords are excluded.
   */
  async getUserDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        isBanned: true,
        banReason: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      } as any,
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    return user;
  }
}
