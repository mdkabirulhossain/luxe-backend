/* eslint-disable prettier/prettier */
import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class ResetPasswordDto {
    @ApiProperty({
        example: 'eyJhbGciOiJIUzI1Ni...',
        description: 'The secure token received in email/SMS'
    })

    @IsNotEmpty()
    @IsString()
    token!: string;

    @ApiProperty({
        example: 'newSecurePassword123',
        description: 'The new password'
    })
    @IsString()
    @MinLength(6)
    password!: string;
}