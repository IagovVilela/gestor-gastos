import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateBalanceDto {
  @ApiProperty({ example: 5000.00, description: 'Novo saldo' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  balance: number;
}

