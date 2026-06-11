/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ResendVerificationDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'The email address of the user to resend verification',
  })
  @IsNotEmpty()
  @IsEmail()
  email!: string;
}
