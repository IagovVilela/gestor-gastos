import { IsString, IsNotEmpty, IsNumber, IsDateString, IsOptional, IsBoolean, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RecurringType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateExpenseDto {
  @ApiProperty({ example: 'Supermercado', description: 'Descrição da despesa' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 250.50, description: 'Valor da despesa' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  amount: number;

  @ApiProperty({ example: '2024-01-15T00:00:00.000Z', description: 'Data da despesa' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ example: null, description: 'ID da categoria', required: false })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ example: false, description: 'Se é despesa recorrente', required: false })
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @ApiProperty({ enum: RecurringType, example: RecurringType.MONTHLY, description: 'Tipo de recorrência', required: false })
  @IsEnum(RecurringType)
  @IsOptional()
  recurringType?: RecurringType;

  @ApiProperty({ example: false, description: 'Se é gasto fixo', required: false })
  @IsBoolean()
  @IsOptional()
  isFixed?: boolean;

  @ApiProperty({ example: 'Compra mensal', description: 'Notas adicionais', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: '/uploads/receipts/abc123.jpg', description: 'URL da imagem do comprovante', required: false })
  @IsString()
  @IsOptional()
  receiptImageUrl?: string;
}

