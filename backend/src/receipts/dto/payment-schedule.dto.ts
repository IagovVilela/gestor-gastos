import { IsNumber, IsInt, Min, Max, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PaymentScheduleItemDto {
  @ApiProperty({ example: 15, description: 'Dia do mês (1-31) ou -1 para último dia do mês' })
  @IsInt()
  @Min(-1)
  @Max(31)
  day: number; // Dia do mês (1-31) ou -1 para último dia do mês

  @ApiProperty({ example: 40, description: 'Percentual do valor total (0-100) ou valor fixo se usePercentage=false' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  value: number; // Percentual (0-100) ou valor fixo

  @ApiProperty({ example: true, description: 'Se true, value é percentual; se false, value é valor fixo' })
  @IsOptional()
  usePercentage?: boolean; // Se true, value é percentual; se false, value é valor fixo
}

export class PaymentScheduleDto {
  @ApiProperty({ type: [PaymentScheduleItemDto], description: 'Lista de parcelas da receita' })
  @ValidateNested({ each: true })
  @Type(() => PaymentScheduleItemDto)
  items: PaymentScheduleItemDto[];
}

