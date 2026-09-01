import { Controller, Get, Post, Patch, Body, Query, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UserService } from '../user/user.service';
import { ChangePasswordDto } from '../user/dto/change-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Role } from '@prisma/client';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { BanUserDto } from './dto/ban-user.dto';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('JWT-auth')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly userService: UserService,
  ) {}

  @Patch('change-password')
  @ResponseMessage('Admin password updated successfully')
  @ApiOperation({
    summary: 'Change password for currently authenticated Admin account',
    description:
      'Allows logged-in Admin to update password after verifying current password. Revokes active refresh tokens for production-grade security.',
  })
  @ApiResponse({ status: 200, description: 'Admin password successfully updated. Refresh token revoked.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Incorrect current password or validation errors.' })
  @ApiResponse({ status: 401, description: 'Unauthorized: Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires Admin role.' })
  async changePassword(
    @Request() req: AuthenticatedRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const adminId = req.user.sub || req.user.id;
    return this.userService.changePassword(adminId, changePasswordDto);
  }

  @Get('users')
  @ResponseMessage('Users retrieved successfully')
  @ApiOperation({ summary: 'Get a paginated list of all users with search and filtering' })
  @ApiResponse({ status: 200, description: 'List of users retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized: Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires Admin role.' })
  async getAllUsers(@Query() query: AdminUserQueryDto) {
    return this.adminService.getAllUsers(query);
  }

  @Get('users/:id')
  @ResponseMessage('User details retrieved successfully')
  @ApiOperation({ summary: 'Get details of a specific user by their ID' })
  @ApiResponse({ status: 200, description: 'User details retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized: Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires Admin role.' })
  @ApiResponse({ status: 404, description: 'Not Found: User with specified ID does not exist.' })
  async getUserDetails(@Param('id') targetUserId: string) {
    return this.adminService.getUserDetails(targetUserId);
  }

  @Post('users/:id/ban')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('User account has been successfully banned')
  @ApiOperation({ summary: 'Ban a user by their ID with a proper reason' })
  @ApiResponse({ status: 200, description: 'User account has been successfully banned.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Self-banning or admin-banning not allowed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized: Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires Admin role.' })
  @ApiResponse({ status: 404, description: 'Not Found: User with specified ID does not exist.' })
  async banUser(
    @Request() req: AuthenticatedRequest,
    @Param('id') targetUserId: string,
    @Body() banUserDto: BanUserDto,
  ) {
    const adminId = req.user.sub || req.user.id;
    return this.adminService.banUser(adminId, targetUserId, banUserDto.reason);
  }

  @Post('users/:id/unban')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('User account has been successfully unbanned')
  @ApiOperation({ summary: 'Unban a user by their ID' })
  @ApiResponse({ status: 200, description: 'User account has been successfully unbanned.' })
  @ApiResponse({ status: 400, description: 'Bad Request: User is not banned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized: Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires Admin role.' })
  @ApiResponse({ status: 404, description: 'Not Found: User with specified ID does not exist.' })
  async unbanUser(
    @Request() req: AuthenticatedRequest,
    @Param('id') targetUserId: string,
  ) {
    const adminId = req.user.sub || req.user.id;
    return this.adminService.unbanUser(adminId, targetUserId);
  }
}


