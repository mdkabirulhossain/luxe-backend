/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Query, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { BanUserDto } from './dto/ban-user.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('JWT-auth')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'Get a paginated list of all users with search and filtering' })
  @ApiResponse({ status: 200, description: 'List of users retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized: Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires Admin role.' })
  async getAllUsers(@Query() query: AdminUserQueryDto) {
    return this.adminService.getAllUsers(query);
  }

  @Get('users/:id')
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
  @ApiOperation({ summary: 'Ban a user by their ID with a proper reason' })
  @ApiResponse({ status: 200, description: 'User account has been successfully banned.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Self-banning or admin-banning not allowed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized: Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires Admin role.' })
  @ApiResponse({ status: 404, description: 'Not Found: User with specified ID does not exist.' })
  async banUser(
    @Request() req: any,
    @Param('id') targetUserId: string,
    @Body() banUserDto: BanUserDto,
  ) {
    const adminId = req.user?.sub || req.user?.id;
    return this.adminService.banUser(adminId, targetUserId, banUserDto.reason);
  }

  @Post('users/:id/unban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unban a user by their ID' })
  @ApiResponse({ status: 200, description: 'User account has been successfully unbanned.' })
  @ApiResponse({ status: 400, description: 'Bad Request: User is not banned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized: Missing or invalid token.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Requires Admin role.' })
  @ApiResponse({ status: 404, description: 'Not Found: User with specified ID does not exist.' })
  async unbanUser(
    @Request() req: any,
    @Param('id') targetUserId: string,
  ) {
    const adminId = req.user?.sub || req.user?.id;
    return this.adminService.unbanUser(adminId, targetUserId);
  }
}
