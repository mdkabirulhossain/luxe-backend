/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { ConflictException, Injectable, UnauthorizedException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaClientService } from '../../prisma-client/prisma-client.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaClientService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async generateTokens(payload: any) {
    const secret = process.env.JWT_SECRET || 'fallbackSecret';
    
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret,
        expiresIn: '15m', // Shorter duration for access token
      }),
      this.jwtService.signAsync(payload, {
        secret,
        expiresIn: '7d', // Longer duration for refresh token
      }),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async updateRefreshToken(userId: string, refreshToken: string | null) {
    if (refreshToken) {
      const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshToken: hashedRefreshToken } as any,
      });
    } else {
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null } as any,
      });
    }
  }

  async register(dto: RegisterDto) {
    // Check if email is already registered
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingEmail) {
      throw new ConflictException('This email address is already registered.');
    }

    // Check if phone is already registered (only if phone is provided)
    if (dto.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });

      if (existingPhone) {
        throw new ConflictException('This phone number is already registered.');
      }
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Generate a 6-digit OTP (industry standard — like Gmail, Facebook, Amazon)
    const otp = crypto.randomInt(100000, 999999).toString();
    // Hash the OTP before storing — only the hash is persisted
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        phone: dto.phone,
        isEmailVerified: false,
        emailVerificationToken: otpHash,
        emailVerificationExpires: otpExpiry,
      } as any,
    });

    // Send the raw OTP to the user's email
    await this.mailService.sendVerificationEmail(user.email, otp);

    // Generate access & refresh tokens
    const payload = { sub: user.id, email: user.email, role: (user as any).role };
    const tokens = await this.generateTokens(payload);
    await this.updateRefreshToken(user.id, tokens.refresh_token);

    const { password, ...result } = user;
    return {
      message: 'User registered successfully. Please verify your email.',
      ...tokens,
      user: result,
    };
  }

  async login(dto: LoginDto) {
    // Look up user by email or phone
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.identifier },
          { phone: dto.identifier },
        ],
      },
    });

    if (!user) {
      this.logger.warn(`Login failed: No user found with identifier "${dto.identifier}"`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user has a password (OAuth-only users won't have one)
    if (!user.password) {
      this.logger.warn(`Login failed: User "${dto.identifier}" has no password (OAuth-only account)`);
      throw new UnauthorizedException('This account uses social login. Please log in with Google.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`Login failed: Incorrect password for user "${dto.identifier}"`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if ((user as any).isBanned) {
      throw new ForbiddenException(`Your account has been banned. Reason: ${(user as any).banReason || 'No reason specified'}`);
    }

    // Require email verification
    if (!(user as any).isEmailVerified) {
      throw new ForbiddenException('Please verify your email before logging in.');
    }

    // Include clean authorization claims in payload signature
    const payload = { sub: user.id, email: user.email, role: (user as any).role };
    const tokens = await this.generateTokens(payload);
    await this.updateRefreshToken(user.id, tokens.refresh_token);
    
    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: (user as any).role,
      },
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    // Look up user by email first (OTP is 6 digits, not globally unique)
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new BadRequestException('Invalid email or OTP.');
    }

    if ((user as any).isEmailVerified) {
      throw new BadRequestException('Email is already verified.');
    }

    // Check OTP expiry
    const emailVerificationExpires = (user as any).emailVerificationExpires as Date | null;
    if (!emailVerificationExpires || new Date() > emailVerificationExpires) {
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    // Hash the submitted OTP and compare against stored hash
    const otpHash = crypto.createHash('sha256').update(dto.otp).digest('hex');
    if ((user as any).emailVerificationToken !== otpHash) {
      throw new BadRequestException('Invalid OTP. Please check and try again.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      } as any,
    });

    return { message: 'Email verified successfully. You can now log in.' };
  }

  async resendVerification(dto: ResendVerificationDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new BadRequestException('User with this email does not exist.');
    }

    if ((user as any).isEmailVerified) {
      throw new BadRequestException('Email is already verified.');
    }

    // Rate limiting: enforce a 60-second cooldown between resend requests
    const emailVerificationExpires = (user as any).emailVerificationExpires as Date | null;
    if (emailVerificationExpires) {
      // OTP was created at (expires - 10min), so cooldown ends at (created + 60s)
      const otpCreatedAt = new Date(emailVerificationExpires.getTime() - 10 * 60 * 1000);
      const cooldownEnd = new Date(otpCreatedAt.getTime() + 60 * 1000); // 60 seconds
      if (new Date() < cooldownEnd) {
        throw new BadRequestException('Please wait before requesting another verification email.');
      }
    }

    // Generate a new 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: otpHash,
        emailVerificationExpires: otpExpiry,
      } as any,
    });

    await this.mailService.sendVerificationEmail(user.email, otp);

    return { message: 'Verification OTP resent successfully.' };
  }

  async refreshTokens(dto: RefreshTokenDto) {
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: process.env.JWT_SECRET || 'fallbackSecret',
      });
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !(user as any).refreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    const isMatch = await bcrypt.compare(dto.refreshToken, (user as any).refreshToken);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    const newPayload = { sub: user.id, email: user.email, role: (user as any).role };
    const tokens = await this.generateTokens(newPayload);
    await this.updateRefreshToken(user.id, tokens.refresh_token);

    return tokens;
  }

  async logout(userId: string) {
    await this.updateRefreshToken(userId, null);
    return { message: 'Logged out successfully.' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.identifier },
          { phone: dto.identifier },
        ],
      },
    });

    // Security Best Practice: Don't throw a 404 if the user doesn't exist.
    // Instead, return a generic message to prevent account enumeration attacks.
    if (!user) {
      return { message: 'If the account exists, a reset link has been sent.' };
    }

    // Generate a secure reset token and set an expiration time (e.g., 15 minutes)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins from now

    // Save token securely to user schema
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: tokenHash,
        resetTokenExpires: tokenExpiry,
      } as any,
    });

    // Send email reset link
    await this.mailService.sendResetPasswordEmail(user.email, resetToken);

    return { message: 'If the account exists, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');

    // Find the user with a valid, non-expired token
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: tokenHash,
        resetTokenExpires: { gte: new Date() },
      } as any,
    });

    if (!user) {
      throw new UnauthorizedException('Password reset token is invalid or has expired.');
    }

    // Hash and store the updated password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null, // Clear token after successful consumption
        resetTokenExpires: null,
      } as any,
    });

    return { message: 'Password reset successful. You can now log in.' };
  }

  async googleLogin(req: any) {
    if (!req.user) {
      throw new UnauthorizedException('Authentication failed via Google');
    }

    // req.user contains the profile data parsed out by passport-google-oauth20
    const { email, name, picture } = req.user;

    // Check if user already exists
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Create user smoothly via JIT (Just-In-Time) provisioning
      user = await this.prisma.user.create({
        data: {
          email,
          name,
          isEmailVerified: true, // Google email is already verified
          // Generate a long random password placeholder for OAuth-only signups
          password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10), 
        } as any,
      });
    }

    if ((user as any).isBanned) {
      throw new ForbiddenException(`Your account has been banned. Reason: ${(user as any).banReason || 'No reason specified'}`);
    }

    const payload = { sub: user.id, email: user.email, role: (user as any).role };
    const tokens = await this.generateTokens(payload);
    await this.updateRefreshToken(user.id, tokens.refresh_token);

    return {
      ...tokens,
      user: { id: user.id, name: user.name, email: user.email },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new UnauthorizedException('User profile session not found');
    
    const { password, ...result } = user;
    return result;
  }
}