import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'Access token JWT' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'Refresh token JWT' })
  refreshToken: string;

  @ApiProperty({ description: 'Dados do usuário autenticado' })
  user: {
    id: string;
    name: string;
    email: string;
  };
}

