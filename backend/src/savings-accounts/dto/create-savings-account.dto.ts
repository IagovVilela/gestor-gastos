import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateSavingsAccountDto {
  @ApiProperty({ example: 'Reserva de Emergência', description: 'Nome da poupança' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Poupança para emergências médicas e imprevistos', description: 'Descrição da poupança', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 50000.00, description: 'Meta de valor (opcional)', required: false })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  targetAmount?: number;

  @ApiProperty({ example: 'uuid-do-banco', description: 'ID do banco associado', required: false })
  @IsUUID()
  @IsOptional()
  bankId?: string;

  @ApiProperty({ example: 'uuid-da-meta', description: 'ID da meta associada (opcional)', required: false })
  @IsUUID()
  @IsOptional()
  goalId?: string;

  @ApiProperty({ example: '#3B82F6', description: 'Cor para identificação visual', required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ example: 'piggy-bank', description: 'Ícone para identificação visual', required: false })
  @IsString()
  @IsOptional()
  icon?: string;
}







