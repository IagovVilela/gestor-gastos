import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, Min, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BankType } from '@prisma/client';

export class CreateBankDto {
  @ApiProperty({ example: 'Nubank', description: 'Nome do banco' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ 
    enum: BankType, 
    example: BankType.CURRENT_ACCOUNT, 
    description: 'Tipo de conta',
    required: false 
  })
  @IsEnum(BankType)
  @IsOptional()
  type?: BankType;

  @ApiProperty({ example: 5000.00, description: 'Saldo inicial', required: false })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  balance?: number;

  @ApiProperty({ example: false, description: 'Se é o banco principal', required: false })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @ApiProperty({ example: '#8B5CF6', description: 'Cor para identificação visual', required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ example: 'credit-card', description: 'Ícone para identificação visual', required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  // Campos específicos para contas poupança
  @ApiProperty({ example: 'uuid-da-meta', description: 'ID da meta para associar à poupança (apenas para contas poupança)', required: false })
  @IsUUID()
  @IsOptional()
  savingsGoalId?: string;

  @ApiProperty({ example: 'Reserva de Emergência', description: 'Nome da poupança (apenas para contas poupança)', required: false })
  @IsString()
  @IsOptional()
  savingsName?: string;

  @ApiProperty({ example: 'Poupança para emergências', description: 'Descrição da poupança (apenas para contas poupança)', required: false })
  @IsString()
  @IsOptional()
  savingsDescription?: string;

  @ApiProperty({ example: 'uuid-da-poupança', description: 'ID da poupança existente para associar (apenas para contas poupança)', required: false })
  @IsUUID()
  @IsOptional()
  existingSavingsAccountId?: string;
}

