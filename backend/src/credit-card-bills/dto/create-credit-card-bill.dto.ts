import { IsString, IsNotEmpty, IsDateString, IsOptional, IsNumber, Min, IsBoolean, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCreditCardBillDto {
  @ApiProperty({ example: 'Fatura Nubank - Janeiro 2026', description: 'Descrição da fatura' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 15, description: 'Dia do fechamento (1-31)', minimum: 1, maximum: 31 })
  @IsNumber()
  @Min(1)
  @Max(31)
  @Type(() => Number)
  closingDay: number;

  @ApiProperty({ example: 5, description: 'Dia do vencimento (1-31)', minimum: 1, maximum: 31 })
  @IsNumber()
  @Min(1)
  @Max(31)
  @Type(() => Number)
  dueDay: number;

  @ApiProperty({ example: 1, description: 'Mês da fatura (1-12). Se não informado, usa o mês atual', minimum: 1, maximum: 12, required: false })
  @IsNumber()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  @IsOptional()
  month?: number;

  @ApiProperty({ example: 2026, description: 'Ano da fatura. Se não informado, usa o ano atual', required: false })
  @IsNumber()
  @Min(2000)
  @Type(() => Number)
  @IsOptional()
  year?: number;

  @ApiProperty({ example: 16, description: 'Dia da melhor data para fazer compras (1-31, opcional)', minimum: 1, maximum: 31, required: false })
  @IsNumber()
  @Min(1)
  @Max(31)
  @Type(() => Number)
  @IsOptional()
  bestPurchaseDay?: number;

  @ApiProperty({ example: null, description: 'ID do banco do cartão', required: false })
  @IsString()
  @IsOptional()
  bankId?: string;

  @ApiProperty({ example: false, description: 'Se a fatura foi paga', required: false })
  @IsBoolean()
  @IsOptional()
  isPaid?: boolean;

  @ApiProperty({ example: 'Notas sobre a fatura', description: 'Notas adicionais', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

