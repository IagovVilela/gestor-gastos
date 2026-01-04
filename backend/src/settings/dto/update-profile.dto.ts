import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ example: 'João Silva', description: 'Nome do usuário', required: false })
  @IsString()
  @IsOptional()
  @MinLength(2)
  name?: string;

  @ApiProperty({ example: 'joao@example.com', description: 'Email do usuário', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;
}

