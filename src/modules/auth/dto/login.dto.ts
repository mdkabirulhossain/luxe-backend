/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ 
    example: 'user@example.com', 
    description: 'Registered email or phone number used for identifier check' 
  })
  @IsNotEmpty()
  @IsString()
  identifier!: string; // Replaces 'email' to cleanly accept either phone or email formats

  @ApiProperty({ example: 'securePassword123', description: 'Account password' })
  @IsString()
  @MinLength(6)
  password!: string;
}