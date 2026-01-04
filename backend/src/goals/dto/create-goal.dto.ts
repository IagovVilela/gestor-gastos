import { IsString, IsNotEmpty, IsNumber, IsDateString, IsOptional, IsEnum, IsBoolean, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GoalType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateGoalDto {
  @ApiProperty({ example: 'Economizar para viagem', description: 'Título da meta' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Economizar para viajar no final do ano', description: 'Descrição da meta', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 10000.00, description: 'Valor alvo da meta' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  targetAmount: number;

  @ApiProperty({ example: '2024-12-31T00:00:00.000Z', description: 'Data limite da meta', required: false })
  @IsDateString()
  @IsOptional()
  deadline?: string;

  @ApiProperty({ enum: GoalType, example: GoalType.SAVINGS, description: 'Tipo da meta' })
  @IsEnum(GoalType)
  @IsNotEmpty()
  type: GoalType;

  @ApiProperty({ example: null, description: 'ID da categoria (para metas por categoria)', required: false })
  @IsString()
  @IsOptional()
  categoryId?: string;
}


