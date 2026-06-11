/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'User successfully created. Returns Access & Refresh tokens.' })
  @ApiResponse({ status: 409, description: 'Conflict: Email or phone already exists.' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Log in with existing user credentials (Email or Phone)' })
  @ApiResponse({ status: 200, description: 'Successfully authenticated. Returns access & refresh tokens.' })
  @ApiResponse({ status: 401, description: 'Unauthorized: Invalid credentials.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Email verification required.' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile session data' })
  @ApiResponse({ status: 200, description: 'Profile retrieved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized: Missing or invalid token.' })
  async getProfile(@Request() req: any) {
    // Safeguard safe parsing depending on custom strategy signatures
    const userId = req.user?.sub || req.user?.id;
    return this.authService.getProfile(userId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  @ApiOperation({ summary: 'Verify user email address using the received token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Invalid or expired token.' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend email verification token' })
  @ApiResponse({ status: 200, description: 'Verification email resent successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Email already verified or user not found.' })
  async resendVerification(@Body() resendVerificationDto: ResendVerificationDto) {
    return this.authService.resendVerification(resendVerificationDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using a valid refresh token' })
  @ApiResponse({ status: 200, description: 'Tokens successfully refreshed. Returns rotated access & refresh tokens.' })
  @ApiResponse({ status: 401, description: 'Unauthorized: Invalid or expired refresh token.' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOperation({ summary: 'Invalidate current session by clearing the stored refresh token' })
  @ApiResponse({ status: 200, description: 'Successfully logged out.' })
  @ApiResponse({ status: 401, description: 'Unauthorized: Missing or invalid token.' })
  async logout(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.authService.logout(userId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  @ApiOperation({ summary: 'Initiate forgotten password workflow' })
  @ApiResponse({ status: 200, description: 'Dispatches password token via out-of-band channel.' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  @ApiOperation({ summary: 'Submit secure token to change user password' })
  @ApiResponse({ status: 200, description: 'Password reset successfully executed.' })
  @ApiResponse({ status: 401, description: 'Token invalid or expired.' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Get('google')
  @UseGuards(AuthGuard('google')) // Fixed: Use passport AuthGuard strategy redirection
  @ApiOperation({ summary: 'Redirects to Google login screen' })
  async googleAuth(@Request() req: any) {
    // Guards handle authentication redirect automatically
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google')) // Fixed: Use passport AuthGuard
  @ApiOperation({ summary: 'Handles Google identity resolution callback' })
  @ApiResponse({ status: 200, description: 'Successfully authenticated with Google. Returns JWT tokens.' })
  async googleAuthRedirect(@Request() req: any) {
    return this.authService.googleLogin(req);
  }
}
