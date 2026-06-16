/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaClientService } from '../../prisma-client/prisma-client.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly prisma: PrismaClientService) {}

  /**
   * Update profile details (name, phone, avatar) for a user
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    const { name, phone, avatar } = dto;
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (avatar !== undefined) updateData.avatar = avatar;

    if (phone !== undefined) {
      if (phone !== user.phone) {
        // Enforce uniqueness check for phone number
        const phoneExists = await this.prisma.user.findFirst({
          where: { phone, NOT: { id: userId } },
        });
        if (phoneExists) {
          throw new ConflictException('This phone number is already registered by another account.');
        }
      }
      updateData.phone = phone;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    const { password, ...result } = updatedUser;
    return result;
  }

  /**
   * Change user password after verifying their current password
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    // If the user registered via social login and never set a password
    if (!user.password) {
      throw new BadRequestException('Your account does not have a local password set (social login). Please use reset password or contact support.');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Incorrect current password');
    }

    // Hash and store the new password
    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
      },
    });

    return { message: 'Password updated successfully' };
  }
}
