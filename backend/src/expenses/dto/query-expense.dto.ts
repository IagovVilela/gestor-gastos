import { IsOptional, IsDateString, IsString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QueryExpenseDto {
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

  @ApiProperty({ example: false, description: 'Filtrar apenas gastos fixos', required: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isFixed?: boolean;

  @ApiProperty({ example: 'supermercado', description: 'Buscar por descrição', required: false })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ example: false, description: 'Filtrar apenas despesas recorrentes', required: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  isRecurring?: boolean;
}

