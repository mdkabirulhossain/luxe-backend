/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'currentPassword123', description: 'The user\'s current account password' })
  @IsString()
  @IsNotEmpty()
  oldPassword!: string;

  @ApiProperty({ example: 'newSecurePassword456', description: 'The new replacement password (minimum length of 6 characters)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword!: string;
}
