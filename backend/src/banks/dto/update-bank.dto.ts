import { IsString, IsOptional, IsBoolean, IsNumber, Min, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BankType } from '@prisma/client';

export class UpdateBankDto {
  @ApiProperty({ example: 'Nubank', description: 'Nome do banco', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ 
    enum: BankType, 
    example: BankType.CURRENT_ACCOUNT, 
    description: 'Tipo de conta',
    required: false 
  })
  @IsEnum(BankType)
  @IsOptional()
  type?: BankType;

  @ApiProperty({ example: 5000.00, description: 'Saldo atual', required: false })
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

  // Campos específicos para contas poupança (apenas para UPDATE de tipo)
  @ApiProperty({ example: 'uuid-da-poupança', description: 'ID da poupança existente para associar (apenas para contas poupança)', required: false })
  @IsUUID()
  @IsOptional()
  existingSavingsAccountId?: string;
}

