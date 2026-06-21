/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class BanUserDto {
  @ApiProperty({ example: 'Violating Terms of Service', description: 'The reason for banning the user' })
  @IsNotEmpty()
  @IsString()
  @MinLength(3, { message: 'Reason must be at least 3 characters long' })
  reason: string;
}
