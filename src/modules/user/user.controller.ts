/* eslint-disable prettier/prettier */
import { Controller, Patch, Body, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Users')
@Controller('user')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Patch('profile')
  @ApiOperation({ summary: 'Update logged-in user and admin profile details (name, phone, avatar)' })
  @ApiResponse({ status: 200, description: 'Profile successfully updated.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Validation errors.' })
  @ApiResponse({ status: 401, description: 'Unauthorized: Missing or invalid token.' })
  @ApiResponse({ status: 409, description: 'Conflict: Phone number already in use.' })
  async updateProfile(@Request() req: any, @Body() updateProfileDto: UpdateProfileDto) {
    const userId = req.user?.sub || req.user?.id;
    return this.userService.updateProfile(userId, updateProfileDto);
  }

  @Patch('change-password')
  @ApiOperation({ summary: 'Change logged-in user and admin password' })
  @ApiResponse({ status: 200, description: 'Password successfully updated.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Incorrect current password or validation issues.' })
  @ApiResponse({ status: 401, description: 'Unauthorized: Missing or invalid token.' })
  async changePassword(@Request() req: any, @Body() changePasswordDto: ChangePasswordDto) {
    const userId = req.user?.sub || req.user?.id;
    return this.userService.changePassword(userId, changePasswordDto);
  }
}
