import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1Ni...',
    description: 'The refresh token received upon registration or login',
  })
  @IsNotEmpty()
  @IsString()
  refreshToken!: string;
}
