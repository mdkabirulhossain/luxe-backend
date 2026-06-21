/* eslint-disable prettier/prettier */
 
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaClientService } from '../../prisma-client/prisma-client.service';

interface JwtPayload {
  sub: string;
  email?: string;
  role?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaClientService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access token missing');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: process.env.JWT_SECRET || 'fallbackSecret',
      });

      // Verify that the user exists, is active, and has an active session in the database
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User session not found');
      }

      if ((user as any).isBanned) {
        throw new UnauthorizedException(`User account has been banned. Reason: ${(user as any).banReason || 'No reason specified'}`);
      }

      if (!user.isActive) {
        throw new UnauthorizedException('User account has been deactivated');
      }

      if (!user.refreshToken) {
        throw new UnauthorizedException('Session expired or user logged out');
      }

      // Attach the user payload to the request object
      request['user'] = payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type?.toLowerCase() === 'bearer' ? token : undefined;
  }
}