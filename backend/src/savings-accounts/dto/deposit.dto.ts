import { IsNumber, IsNotEmpty, Min, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class DepositDto {
  @ApiProperty({ example: 500.00, description: 'Valor a ser depositado' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  amount: number;

  @ApiProperty({ example: 'uuid-do-banco', description: 'ID do banco de onde o dinheiro será retirado', required: false })
  @IsUUID()
  @IsOptional()
  bankId?: string;

  @ApiProperty({ example: 'Depósito mensal para reserva', description: 'Descrição da transação', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}



