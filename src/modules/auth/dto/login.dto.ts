/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com', description: 'Registered email' })
    @IsEmail()
    @IsNotEmpty()
    email!: string;

  @ApiProperty({ example: 'securePassword123', description: 'Account password' })
    @IsString()
    @MinLength(6)
    password!: string;
}