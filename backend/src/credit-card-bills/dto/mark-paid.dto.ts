import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkPaidDto {
  @ApiProperty({ 
    example: 'uuid-do-banco', 
    description: 'ID do banco usado para pagar a fatura. Se não informado, usa o banco da fatura ou não atualiza saldo.',
    required: false 
  })
  @IsString()
  @IsOptional()
  paymentBankId?: string;
}



