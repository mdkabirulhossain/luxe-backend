/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'User successfully created.' })
  @ApiResponse({ status: 409, description: 'Conflict: Email already exists.' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Log in with existing user credentials' })
  @ApiResponse({ status: 200, description: 'Successfully authenticated. Returns JWT token.' })
  @ApiResponse({ status: 401, description: 'Unauthorized: Invalid credentials.' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth') // Ties this route to the Authorize configurations on top right of Swagger UI
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile session data' })
  @ApiResponse({ status: 200, description: 'Profile retrieved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized: Missing or invalid token.' })
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.sub);
  }
}