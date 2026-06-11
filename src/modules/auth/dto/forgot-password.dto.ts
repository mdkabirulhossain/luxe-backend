/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ 
    example: 'user@example.com', 
    description: 'The email or phone number where the reset link/OTP will be sent' 
  })
  @IsNotEmpty()
  @IsString()
  identifier!: string;
}