import { IsOptional, IsDateString, IsString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QueryReceiptDto {
  @ApiProperty({ example: '2024-01-01', description: 'Data inicial (filtro)', required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ example: '2024-01-31', description: 'Data final (filtro)', required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ example: null, description: 'ID da categoria (filtro)', required: false })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ example: 'salário', description: 'Buscar por descrição', required: false })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ example: false, description: 'Filtrar apenas receitas recorrentes', required: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isRecurring?: boolean;
}

