import { PartialType } from '@nestjs/swagger';
import { CreateSavingsAccountDto } from './create-savings-account.dto';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateSavingsAccountDto extends PartialType(CreateSavingsAccountDto) {
  @ApiProperty({ example: 1000.00, description: 'Valor atual da poupança (para correção manual)', required: false })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  currentAmount?: number;
}


