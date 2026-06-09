/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe', description: 'The full name of the user' })
    @IsString()
    @IsNotEmpty()
    name!: string;

  @ApiProperty({ example: 'user@example.com', description: 'The unique email of the user' })
    @IsEmail()
    @IsNotEmpty()
    email!: string;

  @ApiProperty({ example: 'securePassword123', description: 'Password (min length 6 characters)' })
    @IsString()
    @MinLength(6)
    password!: string;

  @ApiProperty({ example: '+1234567890', description: 'Optional phone number', required: false })
  @IsString()
  @IsOptional()
  phone?: string;
}