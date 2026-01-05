import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkPaidDto {
  @ApiProperty({ 
    example: 'uuid-do-banco', 
    description: 'ID do banco usado para pagar a despesa. Se não informado, usa o banco da despesa ou não atualiza saldo.',
    required: false 
  })
  @IsString()
  @IsOptional()
  paymentBankId?: string;
}

