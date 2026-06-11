/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    example: 'd8c2c5fe70b7ad0ef4f58c704f08cb6001a1c97a8274...',
    description: 'The email verification token received in email',
  })
  @IsNotEmpty()
  @IsString()
  token!: string;
}
