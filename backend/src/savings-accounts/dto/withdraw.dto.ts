import { IsNumber, IsNotEmpty, Min, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class WithdrawDto {
  @ApiProperty({ example: 300.00, description: 'Valor a ser retirado' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  amount: number;

  @ApiProperty({ example: 'uuid-do-banco', description: 'ID do banco para onde o dinheiro será depositado', required: false })
  @IsUUID()
  @IsOptional()
  bankId?: string;

  @ApiProperty({ example: 'Retirada para pagamento de conta', description: 'Descrição da transação', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}





