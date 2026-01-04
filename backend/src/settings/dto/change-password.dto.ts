import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'senhaAtual123', description: 'Senha atual' })
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @ApiProperty({ example: 'novaSenha123', description: 'Nova senha' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

