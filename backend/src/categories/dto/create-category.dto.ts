import { IsString, IsNotEmpty, IsEnum, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CategoryType } from '@prisma/client';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Alimentação', description: 'Nome da categoria' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'Gastos com alimentação', description: 'Descrição da categoria', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: CategoryType, example: CategoryType.EXPENSE, description: 'Tipo da categoria' })
  @IsEnum(CategoryType)
  @IsNotEmpty()
  type: CategoryType;

  @ApiProperty({ example: '#FF5733', description: 'Cor da categoria (hex)', required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ example: '🍔', description: 'Ícone da categoria', required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ example: null, description: 'ID da categoria pai (para subcategorias)', required: false })
  @IsString()
  @IsOptional()
  parentId?: string;
}

