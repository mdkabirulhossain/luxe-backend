import { Role } from '@prisma/client';

export interface UserPayload {
  id: string;
  sub?: string;
  email: string;
  role: Role;
  name?: string;
  picture?: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}
