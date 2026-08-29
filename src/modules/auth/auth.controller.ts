/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Request, Res, UseGuards } from '@nestjs/common';

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
import { ResponseMessage } from '../../common/decorators/response-message.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── Registration & Email Verification ─────────────────────────

  @Post('register')
  @ResponseMessage('User registration successful. Verification OTP sent to email.')
  @ApiOperation({ summary: 'Register a new user account (sends 6-digit OTP to email)' })
  @ApiResponse({ status: 201, description: 'User created. A 6-digit OTP has been sent to the email.' })
  @ApiResponse({ status: 409, description: 'Conflict: Email or phone already exists.' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  @ResponseMessage('Email verified successfully')
  @ApiOperation({ summary: 'Verify email using the 6-digit OTP received in email' })
  @ApiResponse({ status: 200, description: 'Email verified successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Invalid or expired OTP.' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('resend-verification')
  @ResponseMessage('Verification OTP resent successfully')
  @ApiOperation({ summary: 'Resend a new 6-digit verification OTP to email' })
  @ApiResponse({ status: 200, description: 'New OTP sent successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request: Email already verified, user not found, or cooldown active.' })
  async resendVerification(@Body() resendVerificationDto: ResendVerificationDto) {
    return this.authService.resendVerification(resendVerificationDto);
  }

  // ─── Login & Session ───────────────────────────────────────────

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ResponseMessage('Login successful')
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
  @ResponseMessage('User profile retrieved successfully')
  @ApiOperation({ summary: 'Get current user profile session data' })
  @ApiResponse({ status: 200, description: 'Profile retrieved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized: Missing or invalid token.' })
  async getProfile(@Request() req: any) {
    // Safeguard safe parsing depending on custom strategy signatures
    const userId = req.user?.sub || req.user?.id;
    return this.authService.getProfile(userId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ResponseMessage('Tokens refreshed successfully')
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
  @ResponseMessage('Logged out successfully')
  @ApiOperation({ summary: 'Invalidate current session by clearing the stored refresh token' })
  @ApiResponse({ status: 200, description: 'Successfully logged out.' })
  @ApiResponse({ status: 401, description: 'Unauthorized: Missing or invalid token.' })
  async logout(@Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.authService.logout(userId);
  }

  // ─── Password Recovery ─────────────────────────────────────────

  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  @ResponseMessage('Password reset token sent to email if account exists')
  @ApiOperation({ summary: 'Initiate forgotten password workflow' })
  @ApiResponse({ status: 200, description: 'Dispatches password token via out-of-band channel.' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  @ResponseMessage('Password reset successfully')
  @ApiOperation({ summary: 'Submit secure token to change user password' })
  @ApiResponse({ status: 200, description: 'Password reset successfully executed.' })
  @ApiResponse({ status: 401, description: 'Token invalid or expired.' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  // ─── OAuth ─────────────────────────────────────────────────────

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Initiates Google OAuth 2.0 login redirect',
    description:
      '<b>NOTE:</b> Do NOT click the "Execute" button below in Swagger (it triggers a browser CORS "Failed to fetch" error because Google blocks background fetch requests).<br/><br/>👉 <b>To test Google OAuth login:</b> Click this link directly: <a href="http://localhost:5000/auth/google" target="_blank" style="font-weight:bold; color:#007bff;">http://localhost:5000/auth/google</a>',
  })
  @ApiResponse({ status: 302, description: 'HTTP 302 Redirect to Google OAuth 2.0 consent page.' })
  async googleAuth(@Request() req: any) {
    // Passport AuthGuard automatically performs HTTP 302 redirect to Google consent screen
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ResponseMessage('Google authentication successful')
  @ApiOperation({ summary: 'Handles Google identity resolution callback' })
  @ApiResponse({ status: 200, description: 'Successfully authenticated with Google. Redirects to frontend with access_token & refresh_token.' })
  async googleAuthRedirect(@Request() req: any, @Res() res: any) {
    const authData = await this.authService.googleLogin(req);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/oauth-success?access_token=${authData.access_token}&refresh_token=${authData.refresh_token}`;
    return res.redirect(redirectUrl);
  }
}



