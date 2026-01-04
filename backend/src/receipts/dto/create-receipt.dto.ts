import { IsString, IsNotEmpty, IsNumber, IsDateString, IsOptional, IsBoolean, IsEnum, Min, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RecurringType } from '@prisma/client';
import { Type } from 'class-transformer';
import { PaymentScheduleDto } from './payment-schedule.dto';

export class CreateReceiptDto {
  @ApiProperty({ example: 'Salário', description: 'Descrição da receita' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 5000.00, description: 'Valor da receita' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  amount: number;

  @ApiProperty({ example: '2024-01-15T00:00:00.000Z', description: 'Data da receita' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ example: null, description: 'ID da categoria', required: false })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ example: false, description: 'Se é receita recorrente', required: false })
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @ApiProperty({ enum: RecurringType, example: RecurringType.MONTHLY, description: 'Tipo de recorrência', required: false })
  @IsEnum(RecurringType)
  @IsOptional()
  recurringType?: RecurringType;

  @ApiProperty({ example: 'Salário mensal', description: 'Notas adicionais', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: null, description: 'ID do banco onde a receita foi recebida', required: false })
  @IsString()
  @IsOptional()
  bankId?: string;

  @ApiProperty({ type: PaymentScheduleDto, description: 'Distribuição de pagamento para receitas mensais (ex: 40% dia 15, 60% último dia)', required: false })
  @ValidateNested()
  @Type(() => PaymentScheduleDto)
  @IsOptional()
  paymentSchedule?: PaymentScheduleDto;
}


